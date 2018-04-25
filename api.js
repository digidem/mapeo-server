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
  var results = []

  this.osm.kv.createReadStream()
    .on('data', function (row) {
      Object.keys(row.values).forEach(function (version) {
        var obs = row.values[version].value
        if (obs.type !== 'observation') return
        obs.id = row.key
        obs.version = version
        results.push(obs)
      })
    })
    .once('end', function () {
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(results))
    })
    .once('error', function (err) {
      res.statusCode = 500
      res.end('server error while getting observations: ' + err.toString())
    })
}

Api.prototype.observationGet = function (req, res, m) {
  this.osm.get(m.id, function (err, obses) {
    if (err) {
      res.statusCode = 500
      res.end('failed to create observation: ' + err.toString())
      return
    }
    res.setHeader('content-type', 'application/json')
    obses = Object.keys(obses).map(function (version) {
      var obs = obses[version]
      obs.id = m.id
      obs.version = version
      return obs
    })
    res.end(JSON.stringify(obses))
  })
}

Api.prototype.observationCreate = function (req, res, m) {
  var self = this

  body(req, function (err, obs) {
    if (err) {
      res.statusCode = 400
      res.end('couldnt parse body json: ' + err.toString())
      return
    }
    if (obs.lat === undefined || obs.lon === undefined) {
      res.statusCode = 400
      res.end('observation must have "lat" and "lon" fields')
      return
    }

    obs.type = 'observation'
    obs.created_at_timestamp = (new Date().getTime())

    self.osm.create(obs, function (err, _, node) {
      if (err) {
        res.statusCode = 500
        res.end('failed to create observation: ' + err.toString())
        return
      }
      res.setHeader('content-type', 'application/json')
      obs.id = node.value.k
      obs.version = node.key
      res.end(JSON.stringify(obs))
    })
  })
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
  fs.readdir(path.join(__dirname, 'tiles'), function (err, files) {
    if (err) {
      res.statusCode = 500
      res.end(e.toString())
      return
    }
    files = files
      .filter(function (file) { return file.endsWith('.asar') })
      .map(function (file) { return path.parse(file).name })
    res.end(JSON.stringify(files))
  })
}

Api.prototype.tilesGet = function (req, res, m) {
  var asarPath = path.join('tiles', m.id + '.asar')

  var metadataBuf = asarGet(asarPath, 'meta.json')
  if (!metadataBuf) {
    res.statusCode = 500
    res.end('failed to find meta.json')
    return
  }

  var meta
  try {
    meta = JSON.parse(metadataBuf.toString())
  } catch (e) {
    res.statusCode = 500
    res.end('failed to parse tileset meta.json')
    return
  }

  if (!meta.ext || !meta.mime) {
    res.statusCode = 500
    res.end('meta.json missing required fields')
    return
  }

  var filename = [m.z, m.y, m.x].join('/') + '.' + meta.ext
  var buf = asarGet(asarPath, filename)

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
