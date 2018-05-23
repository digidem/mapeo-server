var fs = require('fs')
var path = require('path')
var url = require('url')
var body = require('body/json')
var randombytes = require('randombytes')
var asar = require('asar')
var ecstatic = require('ecstatic')

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
    res.end(JSON.stringify(flatObs(m.id, obses)))
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
  var self = this
  this.osm.get(m.id, function (err, obses) {
    if (err) {
      res.statusCode = 500
      res.end('failed to update observation:' + err.toString())
      return
    }
    if (obses.length === 0) {
      res.statusCode = 500
      res.end('failed to update observation: No observation found with id ' + m.id)
      return
    }
    obses = flatObs(m.id, obses)

    body(req, function (err, obs) {
      if (err) {
        res.statusCode = 400
        res.end('couldnt parse body json: ' + err.toString())
        return
      }
      var old = obses[0]
      var newObs = Object.assign(old, obs)
      self.osm.put(m.id, newObs, function (err, node) {
        if (err) {
          res.statusCode = 500
          res.end('failed to update observation:' + err.toString())
          return
        }
        res.setHeader('content-type', 'application/json')
        obs.id = node.value.k
        obs.version = node.key
        res.end(JSON.stringify(obs))
      })
    })
  })
}

// Presets
Api.prototype.presetsList = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  fs.readdir(path.join(__dirname, 'presets'), function (err, files) {
    if (err) {
      res.statusCode = 500
      res.end(err.toString())
      return
    }
    files = files
      .filter(function (filename) {
        return fs.statSync(path.join(__dirname, 'presets', filename)).isDirectory()
      })
    res.end(JSON.stringify(files))
  })
}

Api.prototype.presetsGet = function (req, res, m) {
  var pathname = url.parse(req.url).pathname

  ecstatic({
    root: __dirname,
    handleError: false,
  })(req, res)
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
Api.prototype.stylesList = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  fs.readdir(path.join(__dirname, 'styles'), function (err, files) {
    if (err) {
      res.statusCode = 500
      res.end(err.toString())
      return
    }
    files = files
      .filter(function (file) {
        var stat = fs.statSync(path.join('styles', file))
        return stat.isDirectory() && fs.existsSync(path.join('styles', file, 'style.json'))
      })
      .map(function (dir) {
        var str = fs.readFileSync(path.join('styles', dir, 'style.json'), 'utf-8')
        if (str) {
          try {
            var json = JSON.parse(str)
            var srcTop = Object.keys(json.sources)[0] || {}
            var src = json.sources[srcTop]
            if (!src) return null
            return {
              id: dir,
              name: json.name,
              description: json.description,
              bounds: src.bounds,
              minzoom: src.minzoom,
              maxzoom: src.maxzoom
            }
          } catch (e) {
            return null
          }
        } else {
          return null
        }
      })
      .filter(Boolean)
    res.end(JSON.stringify(files))
  })
}

Api.prototype.stylesGetStyle = function (req, res, m) {
  serveStyleFile(path.join('styles', m.id, 'style.json'), m.id, req, res)
}

Api.prototype.stylesGetStatic = function (req, res, m) {
  var pathname = url.parse(req.url).pathname

  ecstatic({
    root: __dirname,
    handleError: false,
  })(req, res)
}

Api.prototype.stylesGet = function (req, res, m) {
  var asarPath = path.join('styles', m.id, 'tiles', m.tileid + '.asar')

  var filename = [m.z, m.y, m.x].join('/') + '.' + m.ext
  var buf = asarGet(asarPath, filename)

  if (buf) {
    var mime
    switch (m.ext) {
      case 'png': mime = 'image/png'; break
      case 'jpg': mime = 'image/jpg'; break
    }
    if (mime) res.setHeader('content-type', mime)
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

function serveStyleFile (styleFile, id, req, res) {
  fs.stat(styleFile, function (err, stat) {
    if (err) {
      res.statusCode = 500
      res.end(err.toString())
      return
    }
    fs.readFile(styleFile, 'utf8', function (err, data) {
      if (err) {
        res.statusCode = 500
        res.end(err.toString())
        return
      }
      data = Buffer.from(data.replace(/\{host\}/gm, 'http://' + req.headers.host + '/styles/' + id))
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.setHeader('last-modified', (new Date(stat.mtime)).toUTCString())
      res.setHeader('content-length', data.length)
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.statusCode = 200
      res.end(data)
    })
  })
}

function flatObs (id, obses) {
  return Object.keys(obses).map(function (version) {
    var obs = obses[version]
    obs.id = id
    obs.version = version
    return obs
  })
}
