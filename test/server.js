var Osm = require('osm-p2p-mem')
var blob = require('abstract-blob-store')
var http = require('http')
var Router = require('..')

module.exports = function (cb) {
  var osm = Osm()
  var media = blob()

  var router = Router(osm, media)

  var server = http.createServer(function (req, res) {
    if (router(req, res)) {
    } else {
      res.statusCode = 404
      res.end('not found\n')
    }
  })
  server.listen(5000, function () {
    cb(server, 'http://localhost:5000')
  })
}
