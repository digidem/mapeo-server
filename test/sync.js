var test = require('tape')
var needle = require('needle')
var pump = require('pump')
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
    listen(a, b, function (err) {
      t.error(err)
      var href = a.base + `/sync/peers?interval=100`
      var r = hyperquest(href, {end: false})
      var times = 0
      r.pipe(through.obj(function (data, enc, next) {
        var body = JSON.parse(data)
        t.equal(body.topic, 'peers')
        t.equal(body.message.length, 0)
        times += 1
        next()
      }))
      setTimeout(function () {
        r.destroy()
      }, 2000)
      r.on('error', function (err) {
        t.error(err)
      })
      r.on('end', function () {
        t.ok(times >= 2)
        destroy(a, b, function (err) {
          t.error(err)
          a.server.close()
          b.server.close()
          t.end()
        })
      })
    })
  })
})

test('sync - two-server listen and join and find eachother', function (t) {
  twoServers(function (a, b) {
    a.router.api.core.sync.on('peer', function () {
      var href = a.base + `/sync/peers`
      var hq = hyperquest(href, {end: false})
      hq.pipe(through.obj(function (data, enc, next) {
        var body
        try {
          body = JSON.parse(data.toString())
        } catch (err) {
          t.fail('JSON parse failed: ' + data.toString())
        }
        t.equal(body.message.length, 1, 'message expected length')
        var entry = body.message[0]
        t.equal(entry.type, 'wifi')
        next()
      }))
      setTimeout(function () {
        hq.destroy()
      }, 250)
      hq.on('error', function (err) { t.error(err) })
      hq.on('end', function () {
        destroy(a, b, function (err) {
          t.error(err, 'destroyed without error')
          a.server.close()
          b.server.close()
          t.end()
        })
      })
    })
    listen(a, b, function (err) {
      t.error(err, 'server listening without error')
      join(a, b, function (err) {
        t.error(err, 'join without error')
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
        t.equal(body.topic, 'peers')
        var entry = body.message[0]
        t.equal(body.message.length, 1)
        t.equal(entry.type, 'wifi')
        t.equal(entry.name, 'peer2')
        var href = a.base + `/sync/start?host=${entry.host}&port=${entry.port}`
        var hq = hyperquest(href, {end: false})
        var go = through.obj(function (data, enc, next) {
          var text
          try {
            text = JSON.parse(data.toString())
          } catch (err) {
            t.fail('JSON parse failed: ' + data.toString())
          }
          t.ok(RegExp(/replication-(complete|progress|started)/).test(text.topic))
          if (text.topic === 'replication-complete') {
            needle.get(a.base + '/sync/peers', function (err, resp, body) {
              t.error(err)
              var peers = body.message
              t.same(peers.length, 1, 'one peer')
              t.same(peers[0].state.topic, 'replication-complete')
              next()
            })
          } else next()
        })
        pump(hq, go, done)
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
