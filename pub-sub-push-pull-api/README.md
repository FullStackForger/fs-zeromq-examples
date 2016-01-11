# PUB-SUB PUSH-PULL

## Overview

PUB-SUB PUSH-PULL is a combination of messaging patterns:
* **bi-directional push-pull** to provide asynchronous (not blocking) **request-reply** like communication between the Proxy and the Registry.
* combination of **pub-sub** and **push-pull** to:
 * broadcast action to connected worker Services (pub-sub) and collect results (push-pull) as they come
 * push results back into connected Proxy client (push-pull)

 ```
 .  http(s)                                               +---------------+
    req/res                 +---------------+          +---------------+  |
     v   ^                  |      PUB      | <------- |      SUB      |--+
 +---------------+          +---------------+          +---------------+  |
 |               |          |               |          |               |  |
 |     Proxy     |          |   Registry    |          |    Service    |  |
 |     client    |          |    server     |          |    client(s)  |  |
 |               |          |               |          |               |--+
 +---------------+          +---------------+          +---------------+  |
 |     PUSH      | -------> |      PULL     | <------- |      PUSH     |--+
 +---------------+          +---------------+          +---------------+
 |     PULL      | -------> |      PUSH     |
 +---------------+          +---------------+
 ```

### Transport

Services use 2 part (multipart type) message to communicate.

### Message Header
First part of the message holds pattern information. It is a string consists of 2 space separated parts: request type and message pattern string.
```
REQ api/user/4
REP api/user/4
PREQ api/user/4?q=fname
PREP api/user/2?q=lname
```
#### Message pattern type

#### Message pattern string

### Message data
Second part of the message stores data information. It is expected to be a JSON string, regular stringified data object, eg.:
```
{"uri":"api/user/4","id":4}
```

### Components

#### Proxy
**Connections**
* Connects local PULL socket to remote Registry PUSH socket
* Connects local PUSH socket to remote Registry PULL socket

**Responsibilities**
* Digests http(s) requests.
* Handles authentication (parsing headers).
* Parses and registers requests internally.
* Sends request action messages (PUSH).
* Collects request action results (PULL).
* Responds to http(s) request.

#### Registry
**Connections**
* Listens on local PULL socket
* Listens on local PUSH socket
* Listens on local PUB socket

**Responsibilities**
* Collects required actions (PULL).
* Registers collected actions internally.
* Broadcasts collected actions (PUB) for processing.
* Receives processed results (PULL).
* Pushes back collected results (PUSH).

#### Service(s)
**Connections**
* Connects local SUB socket to remote Registry PUB socket
* Connects local PUSH socket to remote Registry PULL socket

**Responsibilities**
* Listens for incoming action messages (SUB).
* Performs required actions.
* Sends result back to Registry (PUSH).

## Demo

For best console log run in 3 separate terminals
```
node proxy-client.js
node service-client.js
node registry-server.js
```

> It is important you run `registry-client` before you run `service-client`

If you run `service-client` as the last service, because of PUB-SUB connection between them. Otherwise, registry will publish messages and because of missing subscribers they will be dropped.

If have similar architecture in production order of starting services doesn't really matter. Some request will not be processed either way as it takes time to (1) startup the service and (2) establish connection between services.
