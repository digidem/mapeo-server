var fs = require('fs')
var path = require('path')
var url = require('url')
var body = require('body/json')
var JSONStream = require('JSONStream')
var pump = require('pump')
var ndjson = require('ndjson')
var randombytes = require('randombytes')
var asar = require('asar')

module.exports = Api

function Api (osm, media) {
  if (!(this instanceof Api)) return new Api(osm, media)
  this.osm = osm
  this.media = media
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
  var self = this

  this.media.exists(m.id, function (err, exists) {
    if (err) {
      res.statusCode = 500
      res.end('ERROR: ' + err.toString())
    } else if (!exists) {
      res.statusCode = 404
      res.end()
    } else {
      res.setHeader('content-type', 'image/jpeg')
      self.media.createReadStream(m.id).pipe(res)
    }
  })
}

Api.prototype.mediaPost = function (req, res, m) {
  var id = randombytes(16).toString('hex')
  var mime = req.headers['content-type']
  res.setHeader('content-type', 'application/json')
  req.pipe(this.media.createWriteStream(id))
    .once('finish', function () {
      res.end(JSON.stringify({id: id}))
    })
    .once('error', function (err) {
      res.statusCode = 500
      res.end(err.toString())
    })
}


// Tiles
Api.prototype.tilesList = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  res.end(JSON.stringify(['oakland']))
}

Api.prototype.tilesGet = function (req, res, m) {
  var metadataBuf = asarGet(m.id + '.asar', 'meta.json')
  if (!metadataBuf) {
    res.statusCode = 500
    res.end()
    return
  }

  var meta
  try {
    meta = JSON.parse(metadataBuf.toString())
  } catch (e) {
    res.statusCode = 500
    res.end('failed to parse tileset metadata.json')
    return
  }

  if (!meta.ext || !meta.mime) {
    res.statusCode = 500
    res.end('metadata.json missing required fields')
    return
  }

  var filename = [m.z, m.y, m.x].join('/') + '.' + meta.ext
  var buf = asarGet(m.id + '.asar', filename)

  if (buf) {
    res.setHeader('content-type', meta.mime)
    res.end(buf)
  } else {
    res.statusCode = 404
    res.end()
  }
}


// Sync
Api.prototype.syncAdb = function (req, res, m) {
  // 200 OK
  res.end()
}

function asarGet (archive, fn) {
  try {
    return asar.extractFile(archive, fn)
  } catch (e) {
    return undefined
  }
}
