var test = require('tape')
var needle = require('needle')
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
    a.router.api.core.sync.on('target', function () {
      needle.get(a.base + '/sync/targets', function (err, resp, body) {
        t.error(err)
        t.equal(body.length, 1)
        var entry = body[0]
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
