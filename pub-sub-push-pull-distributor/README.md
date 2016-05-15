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

For best console log run in 3 separate terminals
```
node distributor-server.js
node device-provider-client.js
node user-provider-client.js
node consumer-client.js
```

> It is important you run `Distributor-client` before you run `service-client`

Run `Distributor-client` as the last service to keep PUB-SUB connection in sync.
Otherwise, Distributor will publish messages and because of missing subscribers they will be dropped.

If have similar architecture in production order of starting services doesn't really matter.
Some request will not be processed either way as it takes time to:
1. Startup the service.
2. Establish connection between services.

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
                         +---------------+       +---------------+  |
                         |     PUB (3)   o--->---|  (4) SUB      |--+
 +---------------+       +---------------+       +---------------+  |
 |               |       |               |       |               |  |
 |   Consumer    |       |  Distributor  |       |    Provider   |  |
 |   client      |       |   server      |       |    client(s)  |  |
 |               |       |               |       |               |  |
 |               |       |               |       |               |--+
 +---------------+       +---------------+       +---------------+  |
 |     PUSH (1)  |--->---o  (2) PULL (6) o---<---|  (5) PUSH     |--+
 +---------------+       +---------------+       +---------------+
 |     PULL (8)  |---<---o  (7) PUSH     |
 +---------------+       +---------------+

```

## Transport

Services use 2 part (multipart type) message to communicate.

### Message Header

First part of the message holds pattern information.
Message Header is simply a string that consists of 2 space separated parts:
* message type and
* message pattern string.

Example message headers:
```
REQ api/user/4
REP api/user/4
PREQ api/user/4?q=fname
PREP api/user/2?q=lname
```

#### Message type

* REQ - action request sent from *Consumer* (PUSH 1) to the Distributor (PULL 2) and forwarded (PUB 3) to  a Provider (SUB 4)
* REP - action reply sent from the Client (PUSH 5) to the Distributor (PULL 6) and sent back (PUSH 7) to Consumer
* PREQ - partial (internal) request sent from the Provider (PUSH 5) to the Distributor (PULL 6) and sent back (PUB 3) to another Provider (SUB 4)
* PREP - partial (internal) reply sent from (PUSH) Provider and sent back (PUSH) to Provider

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
