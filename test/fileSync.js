var test = require('tape')
var tmp = require('tmp')
var hyperquest = require('hyperquest')
var through = require('through2')
var {createServer} = require('./server')

test('file sync - create syncfile', function (t) {
  var filename = tmp.fileSync().name
  createServer(function (server, base) {
    function done (err) {
      t.error(err)
      server.close()
      t.end()
    }
    var href = base + `/sync/start?filename=${filename}`
    var hq = hyperquest(href, {end: false})
    hq.pipe(through.obj(function (data, enc, next) {
      var text
      try {
        text = JSON.parse(data.toString())
      } catch (err) {
        t.fail('JSON parse failed: ' + data.toString())
      }
      t.ok(RegExp(/replication-(complete|progress|started)/).test(text.topic))
      next()
    }))
    hq.on('error', done)
    hq.on('end', done)
  })
})
