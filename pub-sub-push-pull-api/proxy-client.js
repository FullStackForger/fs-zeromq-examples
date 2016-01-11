'use strict'
var zmq = require('zmq');

process.stdin.resume();
//require('tty').setRawMode(true);

var
  pushSock = zmq.socket('push'), // connects to pull on 5010
  pullSock = zmq.socket('pull'), // connects to push on 5011
  actions = [] // {id, pattern}

pushSock.connect("tcp://localhost:5010")
pullSock.connect("tcp://localhost:5011")

pullSock.on('message', function() {
  let pattern = arguments[0].toString()
  let data = arguments[1].toString()
  console.log('PULL\t', pattern, data)
});

process.on('SIGINT', function() {
  pushSock.close();
  pullSock.close();
  process.exit();
});

function sendActionMessages(total, interval) {
  var count = 0
  let intervalId = setInterval(function() {
    count++
    let msg = {
      uri: "api/" + ((count % 2 == 0) ? 'user' : 'data' ) + '/' + count,
      id: count
    }

    let pattern = 'REQ ' + msg.uri
    let data = JSON.stringify(msg)
    console.log('PUSH\t', pattern, data)
    pushSock.send([pattern, data])

    if ( count == total) clearInterval(intervalId)
  }, interval)
}


sendActionMessages(10, 10)
