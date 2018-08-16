var test = require('tape')
var needle = require('needle')
var {createServer, twoServers} = require('./server')

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
    needle.get(a.base + '/sync/announce', function (err, resp, body) {
      t.error(err)
      needle.get(b.base + '/sync/announce', function (err, resp, body) {
        t.error(err)
        needle.get(a.base + '/sync/announce', function (err, resp, body) {})
        a.router.api.sync.on('connection', function () {
          needle.get(a.base + '/sync/targets', function (err, resp, body) {
            t.error(err)
            t.same(body.length, 1)
            unannounce(a, b, function (err) {
              t.error(err)
              a.server.close()
              b.server.close()
              t.end()
            })
          })
        })
      })
    })
  })
})

function unannounce (a, b, cb) {
  needle.get(a.base + '/sync/unannounce', function (err, resp, body) {
    if (err) cb(err)
    needle.get(b.base + '/sync/unannounce', function (err, resp, body) {
      if (err) return cb(err)
      cb(null, resp, body)
    })
  })
}
