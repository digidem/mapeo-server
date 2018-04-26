var Osm = require('osm-p2p')
var blobstore = require('fs-blob-store')
var Router = require('.')

var osm = Osm('./db')
var media = blobstore('./media')

var route = Router(osm, media)

var http = require('http')
var server = http.createServer(function (req, res) {
  if (!route(req, res)) {
    res.statusCode = 404
    res.end('not found\n')
  }
})
server.listen(5000)
