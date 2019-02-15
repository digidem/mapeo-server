var test = require('tape')
var needle = require('needle')
var hyperquest = require('hyperquest')
var through = require('through2')
var {announce, unannounce, createServer, twoServers} = require('./server')

test('sync - announce and close', function (t) {
  createServer(function (server, base) {
    needle.get(base + '/sync/announce', function (err, resp, body) {
      t.error(err)
      needle.get(base + '/sync/unannounce', function (err, resp, body) {
        t.error(err)
        server.close()
        t.end()
      })
    })
  })
})

test('sync - two-server announce and find eachother', function (t) {
  twoServers(function (a, b) {
    a.router.api.core.sync.on('connection', function () {
      needle.get(a.base + '/sync/targets', function (err, resp, body) {
        t.error(err)
        t.equal(body.length, 1)
        var entry = body[0]
        t.equal(entry.name, 'test2')
        t.equal(entry.type, 'wifi')
        unannounce(a, b, function (err) {
          t.error(err)
          a.server.close()
          b.server.close()
          t.end()
        })
      })
    })
    announce(a, b, function (err) {
      t.error(err)
    })
  })
})

test('sync - two-server sync', function (t) {
  twoServers(function (a, b) {
    function done () {
      unannounce(a, b, function (err) {
        t.error(err)
        a.server.close()
        b.server.close()
        t.end()
      })
    }
    a.router.api.core.sync.on('connection', function () {
      needle.get(a.base + '/sync/targets', function (err, resp, body) {
        t.error(err)
        t.equal(body.length, 1)
        var entry = body[0]
        t.equal(entry.type, 'wifi')
        var href = a.base + `/sync/start?host=${entry.host}&port=${entry.port}`
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
        hq.on('end', function () {
          done()
        })
      })
    })
    announce(a, b, function (err) {
      t.error(err)
    })
  })
})
