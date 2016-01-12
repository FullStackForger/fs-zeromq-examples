'use strict'

var
  http = require('http'),
  url = require('url'),
  zmq = require('zmq'),
  addr = '127.0.0.1',
  port = 3000,
  pushSock = zmq.socket('push'),
  subSock = zmq.socket('sub'),
  queue = []

pushSock
  .connect("tcp://localhost:5000")

subSock
  .connect("tcp://localhost:5002")
  .subscribe('REQ /info')
  .on('message', parseMessage)

http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/html"})
  response.write("<pre>")
  response.write(JSON.stringify(url.parse(request.url), true, 2))
  response.write("</pre>")
  response.end()
}).listen(port)
console.log("INFO web server listening on port " + port)

function parseMessage() {
  let header = arguments[0].toString()
  let type = header.split(' ')[0]
  let pattern = header.split(' ')[1]
  let data = arguments[1].toString()
  console.log('SUB\t', header, '\t', data)

  let resHeader = ['REP', pattern].join(' ')
  let resData = JSON.stringify({
    address: 'http://' + addr + ':' + port,
    cache: true
  })
  console.log('PUSH\t', resHeader, '\t', resData)
  pushSock.send([resHeader, resData])
}
