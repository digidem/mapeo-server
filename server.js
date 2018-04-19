var hyperdb = require('hyperdb')
var hosm = require('hyperdb-osm')
var sub = require('subleveldown')
var grid = require('grid-point-store')
var level = require('level')
var Router = require('.')

var db = level('./index')
var osm = hosm({
  db: hyperdb('./db', { valueEncoding: 'json' }),
  index: sub(db, 'idx'),
  pointstore: grid(sub(db, 'geo'))
})

var route = Router(osm)

var http = require('http')
var server = http.createServer(function (req, res) {
  var fn = route(req, res)
  if (fn) {
    fn()
  } else {
    res.statusCode = 404
    res.end('not found\n')
  }
})
server.listen(5000)
