# PUB-SUB PUSH-PULL Distributor

## Rationale

Regular 0MQ REQ-REP is a synchronous ([blocking][b1]) connection.
It is not suitable architecture where single request is a result of processing by multiple
services and completed at different times.  
We need a solution that would permit processing a request before the processing
of the previous request one has been completed.  Using PUB-SUB PUSH-PULL
connection enables REQ-REP like communication without  blocking limitation such
us REQ-REP lock-step.

[b1]: http://zguide.zeromq.org/page:all#Ask-and-Ye-Shall-Receive

## Demo

For best console log output start services from separate terminals.

```
node distributor-server.js
node device-provider-client.js
node user-provider-client.js
node consumer-client.js
```

> Start other services before starting `consumer-client`

Run Distributor as the last service to keep PUB-SUB connection in sync.
Otherwise, Distributor will publish messages and because of missing subscribers they will be dropped.

Note that in similar architecture in production order of starting services doesn't really matter.
Not all requests in real life will be processed either way as it takes time to:
1. Startup the service.
2. Establish connection between services.
There are ways to mitigate that. Find out more in 0MQ official guide.

Emulating consumer requests has been delayed for consistent demo output.
If you look at Consumer client log you should get:
```
PUSH	 REQ api/user/0 {"uri":"api/user/0","id":0}
PULL	 REP api/device/ef04a3e0-fb22-4555-bcf0-e950298b3689 {"id":0,"data":{"userId":0,"name":"John Smith","devices":[{"udid":"fb6f363b-2b8a-47da-99f6-021cabc1042a","agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36"},{"udid":"ef04a3e0-fb22-4555-bcf0-e950298b3689","agent":"Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3"}]}}
PUSH	 REQ api/user/1 {"uri":"api/user/1","id":1}
PULL	 REP api/device/8da15b33-6f34-493c-b11e-d5437b9f7072 {"id":1,"data":{"userId":1,"name":"Tom Blake","devices":[{"udid":"8da15b33-6f34-493c-b11e-d5437b9f7072","agent":"Mozilla/5.0 (iPad; CPU OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3"}]}}
PUSH	 REQ api/user/2 {"uri":"api/user/2","id":2}
PULL	 REP api/device/d881d9c8-eae6-4aab-a6aa-e981d911310f {"id":2,"data":{"userId":2,"name":"Peter Black","devices":[{"udid":"d881d9c8-eae6-4aab-a6aa-e981d911310f","agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586"}]}}
PUSH	 REQ api/user/3 {"uri":"api/user/3","id":3}
PULL	 REP api/user/3 {"id":3,"data":{"userId":3,"name":"Julia Stiles","devices":[]}}
PUSH	 REQ api/user/666 {"uri":"api/user/666","id":4}
PULL	 REP api/user/666 {"id":4,"data":null,"error":"User id: 4 not found"}
PUSH	 REQ api/device/fb6f363b-2b8a-47da-99f6-021cabc1042a {"uri":"api/device/fb6f363b-2b8a-47da-99f6-021cabc1042a","id":5}
PULL	 REP api/device/fb6f363b-2b8a-47da-99f6-021cabc1042a {"id":5,"data":{"udid":"fb6f363b-2b8a-47da-99f6-021cabc1042a","agent":"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36"}}
PUSH	 REQ api/device/t0t411y-n0n-3x1st1ng-ud1d-num63r {"uri":"api/device/t0t411y-n0n-3x1st1ng-ud1d-num63r","id":6}
PULL	 REP api/device/t0t411y-n0n-3x1st1ng-ud1d-num63r {"id":6,"data":null,"error":"device not found"}
```

First column are in order: is a socket connection type, request type,
request pattern and optionally received data.

## Overview

PUB-SUB PUSH-PULL is a combination of messaging patterns:
* bi-directional PUSH-PULL providing asynchronous (not blocking) REQ-REP like
communication between the Consumer and the Distributor allowing:
  * sending request for processing,
  * receiving completed results back
* combination of PUB-SUB and PUSH-PULL enabling:
  * broadcasting actions via PUB-SUB to connected Services,
  * collecting completed results via PUSH-PULL, before sending it back
  the request Consumer

```
.                                                   +---------------+
                         +----------------+       +---------------+  |
                         |   PUB (2,4,6)  o--->---|      SUB      |--+
 +---------------+       +----------------+       +---------------+  |
 |               |       |                |       |               |  |
 |   Consumer    |       |  Distributor   |       |    Provider   |  |
 |   client      |       |    server      |       |    client(s)  |  |
 |               |       |                |       |               |  |
 |               |       |                |       |               |--+
 +---------------+       +----------------+       +---------------+  |
 |    PUSH (1)   |--->---o      PULL      o---<---|  PUSH (3,5,7) |--+
 +---------------+       +----------------+       +---------------+
 |     PULL      |---<---o     PUSH (8)   |
 +---------------+       +----------------+

```

## Data flow

* Consumer client service receives an external request (_not implemented_)
* Consumer registers external request as pending (_not implemented_)
* Consumer sends request REQ type message via PUSH (1) socket,
* Distributor receives Consumer request REQ via PULL
* Distributor broadcasts Consumer request REQ via PUB (2)
* Provider receives Consumer request REQ via SUB
* Provider processes request
  * Provider caches REQ for internal processing
  * Provider sends internal request PREQ via PUSH (3)
  * Distributor receives internal request PREQ on PULL
  * Distributor broadcasts (forwards) internal request PREQ on PUB (4)
  * Corresponding Provider receives request PREQ via SUB
  * Corresponding Provider processes internal request
  * Provider processes request (_more internal requests if needed_)
  * Provider sends internal reply PREP via PUSH (5)
  * Distributor receives internal reply PREP on PULL
  * Distributor broadcasts internal reply PREP via PUB (6)
  * Provider receives internal reply PREP on SUB
* Provider finalizes REQ processing
  * Provider removes request from cache (_if internal processing occurred_)
* Provider sends reply REP via PUSH (7)
* Distributor receives request on PULL
* Distributor forwards reply REP on PUSH (8)
* Consumer service receives final response REP on PULL
* Consumer responds to original client request with final response REP (_not implemented_)
* Distributor receives client request on PULL 2 connection  and forwarded (PUB 3) to  a Provider (SUB 4)

## Transport

Services uses 2-part messages to communicate with each other. Message consists
of message header and message data.

Sending a message to a socket is achieved using 0MQ API, eg:
```
socket.send(['REQ /api/user/10', '{id: 123}])
```

Receiving message requires converting buffer data to string before parsing, eg:
```
subScok.on('message', function() {
	let msgHeader = arguments[0].toString()
	let msgData = JSON.parse(arguments[1].toString())
	let msgHeaderArguments = msgHeader.split(' ')
	let msgType = msgHeaderArguments[0]
	let msgPattern = msgHeaderArguments[1]
)}
```

### Message Header

First part of the message holds pattern information.
Message Header is a string made of 2 space separated values:
* message type
* message pattern

Example message headers:
```
REQ api/user/4
REP api/user/4
PREQ api/user/4?q=fname
PREP api/user/2?q=lname
```

#### Message type

* REQ - consumer request message
* REP - provider reply message
* PREQ - partial request message, internal provider request message
* PREP - partial reply message, internal provider reply

#### Message pattern

Action pattern is regular request string used for pattern matching.
It allows Provider Clients to subscribe only to messages they are interested in, eg.:
```
api/user/4?q=fname
```

### Message data

Second part of the message stores data information.
It is expected to be a JSON string, regular stringified data object, eg.:
```
{"uri":"api/user/4","id":4}
```

## Components

### Consumer Client

* Sends consumer requests to the Distributor (PUSH).
* Collects completed responses (PULL).
* Digest responses, eg: it could respond to HTTP(s) request.

### Distributor

* Listens for Consumer requests (PULL).
* Broadcasts Consumer requests (PUB) for processing.
* Listens for completed results (PULL).
* Forwards completed results back to Consumer Client (PUSH).

### Provider(s)

* Listens for Distributor messages (SUB).
* Digest requests performing required actions.
* Sends result back to Distributor (PUSH).

## Known limitations

This pattern requires additional implementation of handling more than one
Provider client subscribed to the same message pattern.

Request Client has been simplified for the demo purposes.
In practice it would require internal queuing to store incoming HTTP requests
until it receives REP message from the Distributor.
