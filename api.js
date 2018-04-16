var url = require('url')
var body = require('body/json')
var JSONStream = require('JSONStream')
var pump = require('pump')
var ndjson = require('ndjson')
var path = require('path')
var hyperdb = require('hyperdb-osm')

function Api (dir) {
  var project = 'default'
  this.db = hyperdb(path.join(dir, project))
}

Api.prototype.observationList = function (req, res, m) {
  var bbox = url.parse(req.url).query.bbox
  if (m.stream) parser = ndjson.stringify()
  else parser = JSONStream.stringify()
  pump(this.db.observationStream(), parser, res, done)
  function done (err) {
    if (err) {
      res.statusCode = 500
      res.end(err)
    }
  }
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

Api.prototype.observationGet = function (req, res, m) {
  this.db.get(m.id, function (err, result) {
    if (err) {
      res.statusCode = 500
      res.end(err)
      return
    }
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(values(result)))
  })
}

Api.prototype.observationUpdate = function (req, res, m) {
  // TODO
}

Api.prototype.mediaList = function (req, res, m) {
  // TODO
}

Api.prototype.mediaGet = function (req, res, m) {
  var filename = m.filename
  // TODO
}
