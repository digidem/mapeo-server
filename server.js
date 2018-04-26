var Osm = require('osm-p2p')
var blobstore = require('fs-blob-store')
var Router = require('.')

var osm = Osm('./db')
var media = blobstore('./media')

var route = Router(osm, media)

var http = require('http')
var server = http.createServer(route)
server.listen(5000)
