var test = require('tape')
var http = require('http')
var createServer = require('./server')

test('media: upload', function (t) {
  createServer(function (server, url) {
    console.log('url', url)
    server.close()
    t.end()
  })
})

