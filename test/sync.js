var test = require('tape')
var needle = require('needle')
var hyperquest = require('hyperquest')
var through = require('through2')
var {
  listen,
  join,
  leave,
  destroy,
  createServer,
  twoServers
} = require('./server')

test('sync - announce and close', function (t) {
  createServer(function (server, base) {
    needle.get(base + '/sync/listen', function (err, resp, body) {
      t.error(err)
      needle.get(base + '/sync/destroy', function (err, resp, body) {
        t.error(err)
        server.close()
        t.end()
      })
    })
  })
})

test('sync - two-server listen and dont find eachother', function (t) {
  twoServers(function (a, b) {
    setTimeout(function () {
      // wait three seconds, no peers
      needle.get(a.base + '/sync/peers', function (err, resp, body) {
        t.error(err)
        t.equal(body.length, 0)
        destroy(a, b, function (err) {
          t.error(err)
          a.server.close()
          b.server.close()
          t.end()
        })
      })
    }, 3000)
    listen(a, b, function (err) {
      t.error(err)
    })
  })
})

test('sync - two-server listen and join and find eachother', function (t) {
  twoServers(function (a, b) {
    a.router.api.core.sync.on('peer', function () {
      needle.get(a.base + '/sync/peers', function (err, resp, body) {
        t.error(err)
        t.equal(body.length, 1)
        var entry = body[0]
        t.equal(entry.type, 'wifi')
        destroy(a, b, function (err) {
          t.error(err)
          a.server.close()
          b.server.close()
          t.end()
        })
      })
    })
    listen(a, b, function (err) {
      t.error(err)
      join(a, b, function (err) {
        t.error(err)
      })
    })
  })
})

test('sync - two-server sync', function (t) {
  twoServers(function (a, b) {
    function done () {
      destroy(a, b, function (err) {
        t.error(err)
        a.server.close()
        b.server.close()
        t.end()
      })
    }
    a.router.api.core.sync.on('peer', function () {
      needle.get(a.base + '/sync/peers', function (err, resp, body) {
        t.error(err)
        t.equal(body.length, 1)
        var entry = body[0]
        t.equal(entry.type, 'wifi')
        t.equal(entry.name, 'peer2')
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
    a._name = 'peer1'
    b._name = 'peer2'
    listen(a, b, function (err) {
      t.error(err)
      join(a, b, function (err) {
        t.error(err)
      })
    })
  })
})
