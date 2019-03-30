var test = require('tape')
var tmp = require('tmp')
var hyperquest = require('hyperquest')
var through = require('through2')
var {createServer, twoServers} = require('./server')

test('file sync - create syncfile', function (t) {
  var filename = tmp.fileSync()
  createServer(function (server, base) {
    function done (err) {
      t.error(err)
      server.close()
      t.end()
    }
    testFileSync(t, {base}, filename, done)
  })
})

test('file sync - create syncfile and sync to it', function (t) {
  var filename = tmp.fileSync()
  twoServers(function (a, b) {
    function done (err) {
      t.error(err)
      a.server.close()
      b.server.close()
      t.end()
    }
    testFileSync(t, a, filename, function (err) {
      if (err) return done(err)
      testFileSync(t, b, filename, function (err) {
        if (err) return done(err)
        done()
      })
    })
  })
})

function testFileSync (t, server, filename, cb) {
  var href = server.base + `/sync/start?filename=${filename}`
  var hq = hyperquest(href, {end: false})
  hq.pipe(through.obj(function (data, enc, next) {
    var text
    try {
      text = JSON.parse(data.toString())
    } catch (err) {
      t.fail('JSON parse failed: ' + data.toString())
    }
    t.ok(RegExp(/replication-complete/).test(text.topic))
    next()
  }))
  hq.on('error', cb)
  hq.on('end', cb)
}
