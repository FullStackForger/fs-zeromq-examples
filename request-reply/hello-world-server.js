// Hello World server
// Binds REP socket to tcp://*:5555
// Expects "Hello" from client, replies with "world"
// source: http://zguide.zeromq.org/js:hwserver

'use strict'
var
  zmq = require('zmq'),
  responder = zmq.socket('rep'),
  responseNo = 0

responder.on('message', function(request) {
  let msg = JSON.parse(request.toString())
  if (msg.numbers.length == 0) msg.numbers = [0]
  let rpl =  {
    id: msg.id,
    result: msg.numbers.reduce((prev, curr) => {
      return prev + curr
    })
  }

  console.log("IN: [", msg, "]")
  msg.respNo = 0
  setTimeout(() => { responder.send(JSON.stringify(rpl)) }, 1000)
})

responder.bind('tcp://*:5555', function(err) {
  if (err) throw err
  console.log("Listening on 5555…")
})


process.on('SIGINT', function() {
  responder.close()
})
