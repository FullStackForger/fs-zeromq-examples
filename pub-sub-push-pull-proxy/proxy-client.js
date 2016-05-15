'use strict'
var
  http = require('http'),
  url = require('url'),
  zmq = require('zmq'),
  httpProxy = require('http-proxy'),
  pushSock = zmq.socket('push'),
  pullSock = zmq.socket('pull'),
  proxy = httpProxy.createProxyServer({}),
  cache = [], 				// Array of records { pathname, address }
  reqTimeout = 150,		// max time (ms) proxy will wait before timing out request
  reqInterval = 10		// how ofter

pushSock.connect("tcp://localhost:5000")
pullSock.connect("tcp://localhost:5001")

pullSock.on('message', function() {
  let header = arguments[0].toString()
  let type = header.split(' ')[0]
  let pattern = header.split(' ')[1]
  let data = JSON.parse(arguments[1].toString())
  console.log('PULL\t', header, data)

  let record = findRecord(pattern)
  record.address = data.address
  record.cache = data.cache || true
});

process.on('SIGINT', function() {
  pushSock.close()
  pullSock.close()
  process.exit()
});

http.createServer(function(request, response) {
  let requestTime = Date.now()
  let intervalId = setInterval(() => {
    proxyHTTPRequest(request, response)
			.then(() => {
				clearInterval(intervalId)
			})

		let hasTimedOut = Date.now() - requestTime > reqTimeout;
    if (hasTimedOut) {
      response.writeHead(504, {"Content-Type": "text/html"})
      response.write("<h1>504 Gateway Timeout</h1>")
      response.end()
      clearInterval(intervalId)
    }
  }, reqInterval)
}).listen(8080)

console.log("PROXY listening on port 8080")

function proxyHTTPRequest (request, response) {
  let query = url.parse(request.url)
  let pathname = query.pathname
  let error = null
  let record = findRecord(query.pathname)

  if (record == null || !record.address) {
    error = new Error('Request doesn\t have destination yet.')
  }

  return new Promise(function (resolve, reject) {
    if (error !== null) {
    	return reject(error)
		}
    try {
				console.log('PROXY\t', record.pathname, '>', record.address)
				proxy.web(request, response, { target: record.address });
				return resolve()
    } catch (e) {
      return reject(e)
    }
  })
}

function findRecord(pathname) {
  let i = 0
  while (i < cache.length) {
    let record = cache[i]
    if (record.pathname === pathname) return record
    i ++
  }

  let header = ['REQ', pathname].join(' ')
  let data = JSON.stringify({ /* auth data */ })
  cache.push({ pathname: pathname })
  console.log('PUSH\t', header, data)
  pushSock.send([header, data])

  return null
}
