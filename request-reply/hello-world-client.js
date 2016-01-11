// Hello World client
// Connects REQ socket to tcp://localhost:5555
// Sends "Hello" to server.
// source: http://zguide.zeromq.org/js:hwclient
'use strict'
var
  zmq = require('zmq'),
  requester = zmq.socket('req')

// socket to talk to server
console.log("Connecting to hello world server…");


let x = 0;
requester.on("message", function(reply) {
  console.log("IN:", x, ": [", reply.toString(), ']');
  x += 1;
  if (x === 10) {
    requester.close();
    process.exit(0);
  }
});

requester.connect("tcp://localhost:5555");

var index = 0
let timeoutId = setInterval(() => {

  let msg = JSON.stringify({
    action: 'sum',
    id: index,
    numbers: generateNumbers(Math.random() * 10 | 0)
  })

  console.log("OUT:", index, msg)
  requester.send(msg)

  if (index++ > 10) clearInterval(timeoutId)
}, 300)


process.on('SIGINT', function() {
  requester.close();
});


function generateNumbers (count) {
  let arr = []
  for(var i=0; i<count; i++) {
    arr.push(Math.random() * 10 | 0)
  }
  return arr
}
