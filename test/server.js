var blob = require('safe-fs-blob-store')
var needle = require('needle')
var http = require('http')
var Router = require('..')

var mkdirp = require('mkdirp')
var path = require('path')
var rimraf = require('rimraf')
var osmdb = require('kappa-osm')
var kappa = require('kappa-core')
var raf = require('random-access-file')
var level = require('level')
var blobstore = require('safe-fs-blob-store')
var tmp = require('tmp')

module.exports = {
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
  var base = `http://localhost:${opts.port}`
  var dir = tmp.dirSync().name

  rimraf.sync(dir)
  mkdirp.sync(dir)

  var osm = osmdb({
    core: kappa(dir, {valueEncoding: 'json'}),
    index: level(path.join(dir, 'index')),
    storage: function (name, cb) {
      process.nextTick(cb, null, raf(path.join(dir, 'storage', name)))
    }
  })
  var media = blobstore(path.join(dir, 'media'))

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
  if (!cb) {
    cb = opts
    opts = { a: {}, b: {} }
  }
  createServer(Object.assign({
    port: 5000,
    media: opts.a.media
  }, opts.a.opts || {}), function (server, base, osm, media, router) {
    const a = { server, base, osm, media, router }
    createServer(Object.assign({
      port: 5001,
      media: opts.b.media
    }, opts.b.opts || {}), function (server2, base2, osm2, media2, router2) {
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

function announce (a, b, cb) {
  var nameA = a._name || 'unknown'
  var nameB = b._name || 'unknown'
  needle.get(a.base + '/sync/announce?name='+nameA, function (err, resp, body) {
    if (err) return cb(err)
    needle.get(b.base + '/sync/announce?name='+nameB, function (err, resp, body) {
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
