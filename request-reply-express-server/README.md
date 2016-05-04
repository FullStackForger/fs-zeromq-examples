
## Overview

 ```
 .  http(s) 
     req/res                          
      v   ^                 
 +----------------+ 
 | Express server |    
 | +---------------+                       +---------------+
 | | 0MQ Client    |                       |   0MQ Server  |
 | +---------------+                       +---------------+
 | |   REQUEST     | -- (tcp://*:5555) --> |     REPLY     |
 | +---------------+                       +---------------+
 +---------------+          
 ```
 
 ### ZeroMQ Server
 
 0MQ Server listens for requests on TCP socket port 5555.
 
 ### ExpressJS server / ZeroMQ Client
  
 Express server listens for incoming HTTP requests 
 and sends those to ZeroMQ Server.
  
 It is effectively a ZeroMQ client connected to socket port 5555.
 