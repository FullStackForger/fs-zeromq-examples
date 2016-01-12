'use strict'
var zmq = require('zmq')

process.stdin.resume()
//require('tty').setRawMode(true);

var
  pullSock = zmq.socket('pull'),
  pushSock = zmq.socket('push'),
  pubSock = zmq.socket('pub'),
  actions = [] // {id, pattern}

pullSock.bindSync("tcp://*:5000")
pushSock.bindSync("tcp://*:5001")
pubSock.bindSync("tcp://*:5002")

process.on('SIGINT', function() {
  pushSock.close()
  pullSock.close()
  pubSock.close()
  process.exit()
});

pullSock.on('message', function() {

  let header = arguments[0].toString()
  let type = header.split(' ').shift()
  let data = arguments[1].toString()

  console.log('PULL\t', header, '\t', data)

  switch(type) {
    case 'REQ':
      console.log('PUB\t', header, '\t', data)
      pubSock.send([header, data])
      break
    case 'REP':
      console.log('PUSH\t', header, '\t', data)
      pushSock.send([header, data])
      break
  }
})
