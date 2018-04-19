var url = require('url')
var body = require('body/json')
var JSONStream = require('JSONStream')
var pump = require('pump')
var ndjson = require('ndjson')

function Api (osm) {
  this.osm = osm
}

// Observations
Api.prototype.observationList = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify([]))
}

Api.prototype.observationGet = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ id: '123', lat: 12.3, lon: -0.522 }))
}

Api.prototype.observationCreate = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ id: '123', lat: 12.3, lon: -0.522 }))
}

Api.prototype.observationUpdate = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({ id: '123', lat: 12.3, lon: -0.522 }))
}


// Presets
Api.prototype.presetsList = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(['default', 'jungle']))
}

Api.prototype.presetsGet = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({}))
}

// Media
Api.prototype.mediaList = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify([]))
}

Api.prototype.mediaGet = function (req, res, m) {
  var filename = m.filename
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({id: '23230', type: 'image/jpg', data: 'aGVsbG8gd29ybGQgdGhpcyBpcyBpbWFnZSBkYXRhCg=='}))
}

Api.prototype.mediaPut = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify({id: '23230'}))
}

// Tiles
Api.prototype.tilesList = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify([]))
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
