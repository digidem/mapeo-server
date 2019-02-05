var Osm = require('osm-p2p')
var blobstore = require('safe-fs-blob-store')
var Router = require('.')

var osm = Osm('./db')
var media = blobstore('./media')

var route = Router(osm, media)

var ecstatic = require('ecstatic')

var http = require('http')
var server = http.createServer(function (req, res) {
  if (req.url === '/') {
    return ecstatic({root: __dirname})(req, res)
  }
  if (!route.handle(req, res)) {
    res.statusCode = 404
    res.end('not found\n')
  }
})
server.listen(5000, console.log.bind(console, 'listening on port 5000'))
