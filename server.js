var hyperdb = require('hyperdb')
var hosm = require('hyperdb-osm')
var sub = require('subleveldown')
var grid = require('grid-point-store')
var level = require('level')
var blob = require('fs-blob-store')
var Router = require('.')

var db = level('./idx')
var osm = hosm({
  db: hyperdb('./db', { valueEncoding: 'json' }),
  index: sub(db, 'idx'),
  pointstore: grid(sub(db, 'geo'))
})
var media = blob('./media')

var route = Router(osm, media)

var http = require('http')
var server = http.createServer(function (req, res) {
  if (route(req, res)) {
  } else {
    res.statusCode = 404
    res.end('not found\n')
  }
})
server.listen(5000)
