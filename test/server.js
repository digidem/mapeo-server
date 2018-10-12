var Osm = require('osm-p2p-mem')
var blob = require('safe-fs-blob-store')
var needle = require('needle')
var http = require('http')
var Router = require('..')

module.exports = {
  stop,
  announce,
  unannounce,
  createServer,
  twoServers
}

function createServer (opts, cb) {
  if (!cb) {
    cb = opts
    opts = { port: 5000 }
  }
  var osm = Osm()
  var dir = '/tmp/test-mapeo-'+Math.random().toString().substring(3)
  var media = blob(dir)
  var base = `http://localhost:${opts.port}`

  var router = Router(osm, media, opts)

  var server = http.createServer(function (req, res) {
    if (router.handle(req, res)) {
    } else {
      res.statusCode = 404
      res.end('not found\n')
    }
  })
  server.on('close', function () {
    router.api.close()
  })
  server.listen(opts.port, function () {
    cb(server, base, osm, media, router)
  })
}

function twoServers (opts, cb) {
  var name1 = 'test1'
  var name2 = 'test2'
  if (!cb) {
    cb = opts
    opts = { a: {}, b: {} }
  }
  createServer({
    name: name1,
    host: name1,
    port: 5000,
    media: opts.a.media
  }, function (server, base, osm, media, router) {
    const a = { server, base, osm, media, router }
    createServer({
      name: name2,
      host: name2,
      port: 5001,
      media: opts.b.media
    }, function (server2, base2, osm2, media2, router2) {
      const b = {
        server: server2,
        base: base2,
        osm: osm2,
        media: media2,
        router: router2
      }
      cb(a, b)
    })
  })
}

function stop (a, b, cb) {
  needle.get(a.base + '/sync/stop', function (err, resp, body) {
    if (err) return cb(err)
    needle.get(b.base + '/sync/stop', function (err, resp, body) {
      if (err) return cb(err)
      return cb()
    })
  })
}


function announce (a, b, cb) {
  needle.get(a.base + '/sync/announce', function (err, resp, body) {
    if (err) return cb(err)
    needle.get(b.base + '/sync/announce', function (err, resp, body) {
      if (err) return cb(err)
      return cb()
    })
  })
}

function unannounce (a, b, cb) {
  needle.get(a.base + '/sync/unannounce', function (err, resp, body) {
    if (err) return cb(err)
    needle.get(b.base + '/sync/unannounce', function (err, resp, body) {
      if (err) return cb(err)
      return cb()
    })
  })
}
