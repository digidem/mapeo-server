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
  var bbox = url.parse(req.url).query.bbox
  if (m.stream) parser = ndjson.stringify()
  else parser = JSONStream.stringify()
  pump(this.osm.observationStream(), parser, res, done)
  function done (err) {
    if (err) {
      res.statusCode = 500
      res.end(err)
    }
  }
}

Api.prototype.observationGet = function (req, res, m) {
  this.osm.get(m.id, function (err, result) {
    if (err) {
      res.statusCode = 500
      res.end(err)
      return
    }
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(values(result)))
  })
}

Api.prototype.observationCreate = function (req, res, m) {
  body(req, res, function (err, doc) {
    if (err) {
      res.statusCode = 400
      return res.end(err.message)
    }
    // CREATE DOC
    res.end(JSON.stringify({id: 13}))
  })
}

Api.prototype.observationUpdate = function (req, res, m) {
  res.statusCode = 500
  res.end('not implemented')
}


// Presets
Api.prototype.presetsList = function (req, res, m) {
  res.statusCode = 500
  res.end('not implemented')
}

Api.prototype.presetsGet = function (req, res, m) {
  res.statusCode = 500
  res.end('not implemented')
}

// Media
Api.prototype.mediaList = function (req, res, m) {
  res.statusCode = 500
  res.end('not implemented')
}

Api.prototype.mediaGet = function (req, res, m) {
  var filename = m.filename
  res.statusCode = 500
  res.end('not implemented')
}

Api.prototype.mediaPut = function (req, res, m) {
  res.statusCode = 500
  res.end('not implemented')
}

// Tiles
Api.prototype.tilesList = function (req, res, m) {
  res.statusCode = 500
  res.end('not implemented')
}

Api.prototype.tilesGet = function (req, res, m) {
  res.statusCode = 500
  res.end('not implemented')
}

// Sync
Api.prototype.syncAdb = function (req, res, m) {
  res.statusCode = 500
  res.end('not implemented')
}
