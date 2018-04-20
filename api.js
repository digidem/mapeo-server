var FsBlobStore = require('fs-blob-store')
var fs = require('fs')
var path = require('path')
var url = require('url')
var body = require('body/json')
var JSONStream = require('JSONStream')
var pump = require('pump')
var ndjson = require('ndjson')
var randombytes = require('randombytes')

module.exports = Api

function Api (osm, mediadir) {
  if (!(this instanceof Api)) return new Api(osm, mediadir)
  this.osm = osm
  this.media = FsBlobStore(mediadir)
}

// Observations
Api.prototype.observationList = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify([{ id: '123', lat: 12.3, lon: -0.522 }]))
}

Api.prototype.observationGet = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ id: '123', lat: 12.3, lon: -0.522 }))
}

Api.prototype.observationCreate = function (req, res, m) {
  // TODO: parse body, generate random id and return
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ id: '123', lat: 12.3, lon: -0.522 }))
}

Api.prototype.observationUpdate = function (req, res, m) {
  // TODO: parse object, append id that was given
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ id: '123', lat: 12.3, lon: -0.522 }))
}


// Presets
Api.prototype.presetsList = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(['default', 'jungle']))
}

Api.prototype.presetsGet = function (req, res, m) {
  // TODO: grab jungle presets file and dump it here
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({}))
}


// Media
Api.prototype.mediaGet = function (req, res, m) {
  var filename = m.filename
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({id: '23230', type: 'image/jpg', data: 'aGVsbG8gd29ybGQgdGhpcyBpcyBpbWFnZSBkYXRhCg==', length: 22}))
}

Api.prototype.mediaPost = function (req, res, m) {
  var id = randombytes(16).toString('hex')
  console.log('incoming', id)
  var mime = req.headers['content-type']
  res.setHeader('content-type', 'application/json')
  req.pipe(this.media.createWriteStream(id))
    .once('finish', function () {
      console.log('finish')
      res.end(JSON.stringify({id: id, type: mime}))
    })
    .once('error', function (err) {
      res.statusCode = 500
      res.end(err.toString())
    })
  req.on('data', function (buf) { console.log('data', buf.length) })
}


// Tiles
Api.prototype.tilesList = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(['guyana_base','guyana_oil_blocks']))
}

Api.prototype.tilesGet = function (req, res, m) {
  res.setHeader('content-type', 'application/vnd.mapbox-vector-tile')
  res.end(Buffer.alloc(12))
}


// Sync
Api.prototype.syncAdb = function (req, res, m) {
  // 200 OK
  res.end()
}