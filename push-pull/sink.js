// Task sink in node.js
// Binds PULL socket to tcp://localhost:5558
// Collects results from workers via that socket.

var
  zmq  = require('zmq'),
  receiver = zmq.socket('pull'),
  started = false,
  i = 0,
  label = "Total elapsed time"

receiver.on('message', function() {
  // wait for start of batch
  if (!started) {
    console.time(label)
    started = true

  // process 100 confirmations
  } else {
    i += 1
    process.stdout.write(i % 10 === 0 ? ':' : '.')
    if (i === 100) {
      console.log()
      console.timeEnd(label)
      i = 0
      started = false

    }
  }
})

receiver.bindSync("tcp://*:5558")

process.on('SIGINT', function() {
  receiver.close()
  process.exit()
})
