// Task worker in node.js
// Connects PULL socket to tcp://localhost:5557
// Collects workloads from ventilator via that socket
// Connects PUSH socket to tcp://localhost:5558
// Sends results to sink via that socket

var
  zmq      = require('zmq'),
  receiver = zmq.socket('pull'),
  sender   = zmq.socket('push'),
  timeouts = [],
  inProgress = false

receiver.on('message', function(buf) {
  var msec = parseInt(buf.toString(), 10)

  // simple progress indicator for the viewer
  process.stdout.write(buf.toString() + ".")

  // process task
  processTask(msec)

});

// pretend processing task
function processTask(msec) {

  if (msec != null) timeouts.push(msec)
  if (timeouts.length == 0 || inProgress) return
  inProgress = true
  setTimeout(function() {
    sender.send("");
    inProgress = false
    processTask()
  }, timeouts.shift());
}

receiver.connect('tcp://localhost:5557');
sender.connect('tcp://localhost:5558');

process.on('SIGINT', function() {
  receiver.close();
  sender.close();
  process.exit();
});
