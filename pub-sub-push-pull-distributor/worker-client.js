'use strict'
var
  url = require('url'),
  querystring = require('querystring'),
  zmq = require('zmq'),
  pushSock = zmq.socket('push'), // connects to pull on 5010
  subScok = zmq.socket('sub'), // connects to pub on 5012
  patternFilter = 'api/user',
  queue = []

process.stdin.resume();
//require('tty').setRawMode(true);

pushSock.connect("tcp://localhost:5010")
subScok.connect("tcp://localhost:5012")

//subScok.subscribe('')

subScok.subscribe(['REQ', patternFilter].join(' '))
subScok.subscribe(['PREQ', patternFilter].join(' '))
subScok.subscribe(['PREP', patternFilter].join(' '))


subScok.on('message', function() {
  let pattern = arguments[0].toString()
  let patArgs = pattern.split(' ')
  let patType = patArgs[0]
  let patQuery = patArgs[1]

  let data = JSON.parse(arguments[1].toString())
  let reply = {}
  let replyPatt;

  console.log('SUB\t', pattern, data)

  switch(patType) {
    case 'REQ':
      // construct reply object
      reply.id = data.id

      queue.push({
        request: data,
        reply: { id: data.id }
      })

      // request first name internally
      replyPatt = 'PREQ api/user/' + data.id + '?q=fname'
      console.log('PUSH\t', replyPatt)
      pushSock.send([ replyPatt, JSON.stringify(reply) ])

      // request last name internally
      replyPatt = 'PREQ api/user/' + data.id + '?q=lname'
      console.log('PUSH\t', replyPatt)
      pushSock.send([ replyPatt, JSON.stringify(reply) ])
      break

    case 'PREQ':
      let query = querystring.parse(url.parse(patQuery).query)
      replyPatt = ['PREP', patQuery].join(' ')

      // construct reply object
      reply.id = data.id
      if (query.q === 'fname') reply.fname = 'John'
      if (query.q === 'lname') reply.lname = 'Smith'

      console.log('PUSH\t', replyPatt, reply)
      pushSock.send([replyPatt, JSON.stringify(reply)])
      break

    case 'PREP':
      let completedReq = -1
      let index = 0
      queue.forEach(function(obj) {

        if (obj.request.id === data.id) {
          if (data.fname) obj.reply.fname = data.fname
          if (data.lname) obj.reply.lname = data.lname
          if (obj.reply.fname && obj.reply.lname) {
            completedReq = index
          }
        }
        index ++
      })

      if(completedReq === -1) return

      // construct reply object
      reply = queue.splice(completedReq, 1).pop().reply

      replyPatt = 'REP api/user/' + reply.id
      console.log('PUSH\t', replyPatt, reply)
      pushSock.send([replyPatt, JSON.stringify(reply)])
    break
  }
});

process.on('SIGINT', function() {
  subScok.close()
  pushSock.close()
  process.exit()
});
