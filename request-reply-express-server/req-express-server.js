'use strict'
const
	zmq = require('zmq'),
	uuid = require('node-uuid'),
	zreq = zmq.socket('req'),
	express = require('express'),
	app = express()

var reqResponses = {}

zreq.connect('tcp://localhost:5555')

zreq.on('message', function (data) {
	data = JSON.parse(data)
	let msgId = data.id
	let res = reqResponses[msgId]
	res.json({
		id: data.id,
		message: data.message
	})
	reqResponses[msgId] = null
})

app.set('port', process.env.PORT || 3000);
app.get('/', function (req, res) {

	if (!req.query.message) {
		res.status(400)
		res.json({
			statusCode: 400,
			error: "Bad Request",
			message: 'use `msg` in query string, eg.: `http://127.0.0.1:3000/?message=custom%20message`'
		})
		return;
	}

	let msgId = uuid.v4()
	let data = { id: msgId, message: req.query.message }
	reqResponses[msgId] = res
	zreq.send(JSON.stringify(data))
})

app.listen(app.get('port'), function () {
	console.log('Express server listening on port %d in %s mode', app.get('port'), app.get('env'));
})