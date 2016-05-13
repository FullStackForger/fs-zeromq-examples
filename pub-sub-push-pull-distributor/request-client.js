'use strict'
var zmq = require('zmq')

process.stdin.resume()
//require('tty').setRawMode(true)

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


(function sendActionMessages(interval) {

	var reqests = [
		'api/user/0',
		'api/user/1',
		'api/user/2',
		'api/user/3',
		'api/user/666',
		'api/device/fb6f363b-2b8a-47da-99f6-021cabc1042a',
		'api/device/t0t411y-n0n-3x1st1ng-ud1d-num63r'
	]

	var index = 0
	let intervalId = setInterval(function() {

		let msg = {
			uri: reqests[index],
			id: index
		}

		let pattern = 'REQ ' + msg.uri
		let data = JSON.stringify(msg)

		console.log('PUSH\t', pattern, data)
		pushSock.send([pattern, data])

		index++
		if ( index == reqests.length ) {
			clearInterval(intervalId)
		}

	}, interval)
})(10)