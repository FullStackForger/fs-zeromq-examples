'use strict'
const url = require('url')
const UrlPattern = require('url-pattern')
const clone = require('clone')
const zmq = require('zmq')
const pushSock = zmq.socket('push')
const subScok = zmq.socket('sub')

const msgReqPattern = 'api/user'
const msgReqPatternFilter = new UrlPattern('api/user/:userId')
const msgRepPattern = 'api/device'

const users = [
	{
		userId: 0,
		name: "John Smith",
		devices: ['fb6f363b-2b8a-47da-99f6-021cabc1042a', 'ef04a3e0-fb22-4555-bcf0-e950298b3689']
	}, {
		userId: 1,
		name: "Tom Blake",
		devices: ['8da15b33-6f34-493c-b11e-d5437b9f7072']
	}, {
		userId: 2,
		name: "Peter Black",
		devices: ['d881d9c8-eae6-4aab-a6aa-e981d911310f']
	}, {
		userId: 3,
		name: "Julia Stiles",
		devices: []
	}
]

var requestQueue = [];

process.stdin.resume()
//require('tty').setRawMode(true);

pushSock.connect("tcp://localhost:5010")
subScok.connect("tcp://localhost:5012")

//subScok.subscribe('')
subScok.subscribe(['REQ', msgReqPattern].join(' '))
subScok.subscribe(['PREP', msgRepPattern].join(' '))

subScok.on('message', function() {
	let msgHeader = arguments[0].toString()
	let msgData = JSON.parse(arguments[1].toString())
	let msgHeaderArguments = msgHeader.split(' ')
	let msgType = msgHeaderArguments[0]
	let msgPattern = msgHeaderArguments[1]
	let msgParams = msgReqPatternFilter.match(msgPattern)

	console.log('SUB \t', msgHeader, arguments[1].toString() /*msgData*/, msgParams)
	if (msgType !== 'REQ' && msgType !== 'PREP') {
		console.log(`Message ${msgType} is not supported by this service`)
		return;
	}

	let index = 0
	let user = null
	let request = null

	switch(msgType) {
		case 'REQ':
			// find the user
			if (msgParams.userId) {
				while(user == null && index < users.length) {
					user = users[index]
					if (user.userId != msgParams.userId) {
						user = null
						index ++
					}
				}
			}

			request = {
				msgData: msgData,
				respData: {
					id: msgData.id,
					data: user !== null ? clone(user) : null
				}
			}

			// reply without devices
			if (user === null) {
				let respHeader = ['REP', msgPattern].join(' ')
				request.respData.error = `User ${msgData.id} not found`
				let respData = JSON.stringify(request.respData)
				console.log('PUSH\t', respHeader, respData)
				pushSock.send([ respHeader, respData ])
				return
			}

			// queue the request
			requestQueue.push(request)

			// request device info
			user.devices.forEach(function(device) {
				let reqHeader = ['PREQ', `api/device/${device}`].join(' ')
				let reqData = JSON.stringify({id: msgData.id })
				console.log('PUSH\t', reqHeader, reqData)
				pushSock.send([reqHeader, reqData])
			})

			break;

		case 'PREP':
			// find request
			while(request === null && index < requestQueue.length) {
				request = requestQueue[index]
				if (request.msgData.id !== msgData.id) {
					request = null
					index ++
				}
			}

			if (request == null) {
				throw new Error(`Request id: ${msgData.id} not found in the queue`)
			}

			// find user
			user = request.respData.data
			// update devices
			user.devices = user.devices.map((device) => {
				return (typeof device === 'string') && device === msgData.data.udid ? msgData.data : device
			})

			// reply if ready
			let mapped = true
			user.devices.forEach((device) => {
			 if (typeof device === 'string') mapped = false
			})
			if (mapped) {
				let respHeader = ['REP', msgPattern].join(' ')
				let respData = JSON.stringify(request.respData)
				console.log('PUSH\t', respHeader, respData)
				pushSock.send([ respHeader, respData ])
			}
			break;
	}
})

process.on('SIGINT', function() {
	subScok.close()
	pushSock.close()
	process.exit()
})