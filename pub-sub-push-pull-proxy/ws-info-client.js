'use strict'
const http = require('http')
const url = require('url')
const zmq = require('zmq')
const addr = '127.0.0.1'
const port = 3000
const pushSock = zmq.socket('push')
const subSock = zmq.socket('sub')
const patternFilter = '/info'

pushSock
  .connect("tcp://localhost:5000")

subSock
  .connect("tcp://localhost:5002")
  .subscribe(['REQ', patternFilter].join(' '))
  .on('message', parseMessage)

http.createServer(function(request, response) {
  response.writeHead(200, {"Content-Type": "text/html"})
	response.write('<h3>Request info</h3>')
	response.write('<hr />')
  response.write("<pre>")
  response.write(JSON.stringify(url.parse(request.url), true, 2))
  response.write("</pre>")
	response.write('<hr />')
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
