var hyperdb = require('hyperdb')
var hosm = require('hyperdb-osm')
var sub = require('subleveldown')
var grid = require('grid-point-store')
var memdb = require('memdb')
var ram = require('random-access-memory')
var blob = require('abstract-blob-store')
var http = require('http')
var Router = require('..')

module.exports = function (cb) {
  var db = memdb()
  var osm = hosm({
    db: hyperdb(ram, { valueEncoding: 'json' }),
    index: sub(db, 'idx'),
    pointstore: grid(sub(db, 'geo'))
  })
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
