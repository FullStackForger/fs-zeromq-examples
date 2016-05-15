# PUB-SUB PUSH-PULL Proxy

<!--
 ASCI PANELS

  ┌─┬┐  ╔═╦╗  ╓─╥╖  ╒═╤╕
  │ ││  ║ ║║  ║ ║║  │ ││
  ├─┼┤  ╠═╬╣  ╟─╫╢  ╞═╪╡
  └─┴┘  ╚═╩╝  ╙─╨╜  ╘═╧╛
  ← →  ↓ ↑
--->
## Demo

For best console log output run in separate terminals
```
node registry-server.js
node proxy-client.js
node ws-api-client.js
node ws-info-client.js
```

Then navigate to:
 * http://localhost:8080/api
 * http://localhost:8080/info

To bypass proxy you can test both web services separately:
* http://localhost:3000/
* http://localhost:4000/

## Overview

 ```
 .    http(s)
     req / res                          
      ↓     ↑                
 ┌────────────────┐
 │    Web Proxy   │
 │   HTTP Server  │              ┌─────────────────────┐
 │ ┌──────────────┴┐             │  Service Registry   │
 │ │  0MQ Client   │             │    0MQ  Server      │
 │ ├───────────────┤             ├─────────────────────┤
 │ │   PULL        ├─────────────→       PUSH          │
 │ ├───────────────┤             ├──────────┬──────────┤
 │ │   PUSH        ├─────────────→   PULL   │    PUB   │
 │ └──────────────┬┘             └────↑─────┴─────↑────┘
 └────────────────┘                   │           │
            ┌─────────────────────┬───┘           │  
     ┌──────┴────────┐     ┌──────┴────────┐      │
     │     PUSH      │     │     PUSH      │      │
     ├───────────────┤     ├───────────────┤      │
     │  API Service  │     │  Info Service │      │
     │  0MQ Client   │     │  0MQ Client   │      │
     ├───────────────┤     ├───────────────┤      │
     │     SUB       │     │     SUB       │      │               
     └──────┬────────┘     └──────┬────────┘      │
            └─────────────────────┴───────────────┘

 ```
 ## Transport

 Services use 2 part (multipart type) message to communicate.

 ### Message Header

 First part of the message holds pattern information.
 Message Header is simply a string that consists of 2 space separated parts:
 * message type and
 * message pattern string.

 Example message can look similar to one of the following:
 ```
 REQ api/user/4
 REP api/user/4
 PREQ api/user/4?q=fname
 PREP api/user/2?q=lname
 ```

 #### Message type

 * REQ - action request sent from *Proxy* (PUSH 1) to the Registry (PULL 2) and forwarded (PUB 3) to  a Service (SUB 4)
 * REP - action reply sent from the Client (PUSH 5) to the Registry (PULL 6) and sent back (PUSH 7) to proxy
 * PREQ - partial (internal) request sent from the Service (PUSH 5) to the Registry (PULL 6) and sent back (PUB 3) to another Service (SUB 4)
 * PREP - partial (internal) reply sent from (PUSH) service and sent back (PUSH) to service

## Components

### Proxy

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
