'use strict'
var
	zmq = require('zmq'),
	zrep = zmq.socket('rep')

zrep.bind('tcp://*:5555', function(err) {
	if (err) throw err
	console.log("Listening on 5555…")
})

zrep.on('message', function(data) {
	data = JSON.parse(data)
	console.log(data)
	let msgId = data.id
	let results = `Message (${msgId}): ${data.message} has been received successfully`
	zrep.send(JSON.stringify({ id: msgId, message: results }))
})