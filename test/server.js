var Osm = require('osm-p2p-mem')
var blob = require('safe-fs-blob-store')
var http = require('http')
var Router = require('..')

module.exports = function (opts, cb) {
  if (!cb) {
    cb = opts
    opts = { port: 5000 }
  }
  var osm = Osm()
  var dir = '/tmp/test-mapeo-'+Math.random().toString().substring(3)
  var media = blob(dir)

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
    cb(server, `http://localhost:${opts.port}`, osm, media, router)
  })
}
