'use strict'
const url = require('url')
const UrlPattern = require('url-pattern')
const zmq = require('zmq')
const pushSock = zmq.socket('push')
const subScok = zmq.socket('sub')

const msgPattern = 'api/device'
const msgPatternFilter = new UrlPattern('api/device/:udid')

const devices =[
	{
		udid: "fb6f363b-2b8a-47da-99f6-021cabc1042a",
		agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/51.0.2704.106 Safari/537.36"
	},{
		udid: "ef04a3e0-fb22-4555-bcf0-e950298b3689",
		agent: "Mozilla/5.0 (iPhone; CPU iPhone OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3",
	},{
		udid: "8da15b33-6f34-493c-b11e-d5437b9f7072",
		agent: "Mozilla/5.0 (iPad; CPU OS 5_0 like Mac OS X) AppleWebKit/534.46 (KHTML, like Gecko) Version/5.1 Mobile/9A334 Safari/7534.48.3"
	},{
		udid: "d881d9c8-eae6-4aab-a6aa-e981d911310f",
		agent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/46.0.2486.0 Safari/537.36 Edge/13.10586"
	}
]

process.stdin.resume();
//require('tty').setRawMode(true);

pushSock.connect("tcp://localhost:5010")
subScok.connect("tcp://localhost:5012")

//subScok.subscribe('')
subScok.subscribe(['REQ', msgPattern].join(' '))
subScok.subscribe(['PREQ', msgPattern].join(' '))

subScok.on('message', function() {
	let msgHeader = arguments[0].toString()
	let msgData = JSON.parse(arguments[1].toString())
	let msgHeaderArguments = msgHeader.split(' ')
	let msgType = msgHeaderArguments[0]
	let msgPattern = msgHeaderArguments[1]
	let msgParams = msgPatternFilter.match(msgPattern)

	console.log('SUB \t', msgHeader, msgData, msgParams)
	if (msgType != "REQ" && msgType != "PREQ") {
		console.log(`Message ${msgType} is not supported by this service`)
		return;
	}

	let respType = msgType == "REQ" ? "REP" : "PREP"
	let respHeader = [respType, msgPattern].join(' ')
	let respData = {
		id: msgData.id,
		data: null
	}

	if (msgParams.udid) {
		devices.forEach((device) => {
			if (device.udid == msgParams.udid) {
				respData.data = device
			}
		})
	}

	if (respData.data === null) {
		respData.error = 'device not found'
	}
	respData = JSON.stringify(respData)
	console.log('PUSH\t', respHeader, respData)
	pushSock.send([ respHeader, respData ])
})

process.on('SIGINT', function() {
	subScok.close()
	pushSock.close()
	process.exit()
})