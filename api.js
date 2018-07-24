// TODO(noffle): return error strings as valid JSON

var fs = require('fs')
var sync = require('mapeo-sync')
var path = require('path')
var body = require('body/json')
var randombytes = require('randombytes')
var asar = require('asar')
var ecstatic = require('ecstatic')
var xtend = require('xtend')

module.exports = Api

function Api (osm, media, opts) {
  if (!(this instanceof Api)) return new Api(osm, media, opts)
  if (!opts) opts = {}
  this.osm = osm
  this.media = media
  this.opts = opts
  var id = opts.id || 'MapeoDesktop_' + randombytes(8).toString('hex')
  var host = opts.host
  this.staticRoot = opts.staticRoot || '.'
  this.sync = sync(osm, media, {id, host})
  this.browser = opts.listen && this.sync.listen(opts)
}

// Observations
Api.prototype.observationDelete = function (req, res, m) {
  res.setHeader('content-type', 'application/json')
  this.osm.del(m.id, function (err) {
    if (err) {
      res.statusCode = 500
      res.end(JSON.stringify('failed to delete observation: ' + err.toString()))
      return
    }
    res.end('true')
  })
}

Api.prototype.observationList = function (req, res, m) {
  var results = []

  this.osm.kv.createReadStream()
    .on('data', function (row) {
      Object.keys(row.values).forEach(function (version) {
        var obs = row.values[version].value
        if (!obs) return
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
    try {
      validateObservation(obs)
    } catch (err) {
      res.statusCode = 400
      res.end('Invalid observation: ' + err.toString())
    }
    const newObs = whitelistProps(obs)
    newObs.type = 'observation'
    newObs.timestamp = (new Date().toISOString())

    self.osm.create(newObs, function (err, _, node) {
      if (err) {
        res.statusCode = 500
        res.end('failed to create observation: ' + err.toString())
        return
      }
      res.setHeader('content-type', 'application/json')
      newObs.id = node.value.k
      newObs.version = node.key
      res.end(JSON.stringify(newObs))
    })
  })
}

Api.prototype.observationUpdate = function (req, res, m) {
  var self = this

  body(req, function (err, newObs) {
    if (err) {
      res.statusCode = 400
      res.end('couldnt parse body json: ' + err.toString())
      return
    }

    if (typeof newObs.version !== 'string') {
      res.statusCode = 400
      res.end('the given observation must have a "version" set')
      return
    }

    if (newObs.id !== m.id) {
      res.statusCode = 400
      res.end('the given observation\'s id doesn\'t match the id url param')
      return
    }

    try {
      validateObservation(newObs)
    } catch (err) {
      res.statusCode = 400
      res.end('Malformed observation: ' + err.toString())
      return
    }

    self.osm.getByVersion(newObs.version, function (err, obs) {
      if (err && !err.notFound) {
        res.statusCode = 500
        res.end('internal error: ' + err.toString())
        return
      }
      if (err && err.notFound) {
        res.statusCode = 400
        res.end('no such observation with that version')
        return
      }
      if (obs.id !== m.id) {
        res.statusCode = 400
        res.end('observation with that version doesn\'t match the given id')
        return
      }

      var opts = {
        links: [newObs.version]
      }

      var finalObs = whitelistProps(newObs)
      finalObs.type = 'observation'
      finalObs.timestamp = new Date().toISOString()

      self.osm.put(m.id, finalObs, opts, function (err, node) {
        if (err) {
          res.statusCode = 500
          res.end('failed to update observation:' + err.toString())
          return
        }
        res.setHeader('content-type', 'application/json')
        finalObs.id = node.value.k
        finalObs.version = node.key
        res.end(JSON.stringify(finalObs))
      })
    })
  })
}

Api.prototype.observationConvert = function (req, res, m) {
  var self = this

  res.setHeader('content-type', 'application/json')

  // 1. get the observation
  this.osm.get(m.id, function (err, obses) {
    if (err) {
      res.statusCode = 500
      res.end(JSON.stringify('failed to lookup observation: ' + err.toString()))
      return
    }
    if (!Object.keys(obses).length) {
      res.statusCode = 404
      res.end(JSON.stringify('failed to lookup observation: not found'))
      return
    }

    // 2. see if tags.element_id already present (short circuit)
    var obs = obses[Object.keys(obses)[0]]
    if (obs.tags && obs.tags.element_id) {
      res.end(JSON.stringify({ id: obs.tags.element_id }))
      return
    }

    var batch = []

    // 3. create node
    batch.push({
      type: 'put',
      key: randombytes(8).toString('hex'),
      value: xtend(obs, {
        type: 'node'
      })
    })

    // 4. modify observation tags
    obs.tags = obs.tags || {}
    obs.tags.element_id = batch[0].key
    batch.push({
      type: 'put',
      key: m.id,
      value: obs
    })

    // 5. batch modification
    self.osm.batch(batch, function (err) {
      if (err) {
        res.statusCode = 500
        res.end(JSON.stringify('failed to write new element & observation'))
        return
      }
      res.end(JSON.stringify({ id: obs.tags.element_id }))
    })
  })
}

// Presets
Api.prototype.presetsList = function (req, res, m) {
  var self = this
  res.setHeader('content-type', 'application/json')
  fs.readdir(path.join(self.staticRoot, 'presets'), function (err, files) {
    if (err) {
      res.statusCode = 500
      res.end(err.toString())
      return
    }
    files = files
      .filter(function (filename) {
        return fs.statSync(path.join(self.staticRoot, 'presets', filename)).isDirectory()
      })
    res.end(JSON.stringify(files))
  })
}

Api.prototype.presetsGet = function (req, res, m) {
  ecstatic({
    root: this.staticRoot,
    handleError: false
  })(req, res)
}

// Media
Api.prototype.mediaGet = function (req, res, m) {
  var self = this
  var id = m.type + '/' + m.id

  this.media.exists(id, function (err, exists) {
    if (err) {
      res.statusCode = 500
      res.end('ERROR: ' + err.toString())
    } else if (!exists) {
      res.statusCode = 404
      res.end()
    } else {
      if (m.id.endsWith('.jpg')) res.setHeader('content-type', 'image/jpeg')
      else if (m.id.endsWith('.png')) res.setHeader('content-type', 'image/png')
      self.media.createReadStream(id).pipe(res)
    }
  })
}

Api.prototype.mediaPut = function (req, res, m, q) {
  if (!q.file || !fs.existsSync(q.file)) {
    res.statusCode = 400
    res.end()
    return
  }
  if (q.thumbnail && !fs.existsSync(q.thumbnail)) {
    res.statusCode = 400
    res.end()
    return
  }

  var self = this

  var ext = path.extname(q.file)
  var id = randombytes(16).toString('hex') + ext
  res.setHeader('content-type', 'application/json')

  var mediaPath = 'original/' + id
  var thumbnailPath = 'thumbnail/' + id

  function copyFileTo (file, to, cb) {
    var ws = self.media.createWriteStream(to, cb)
    fs.createReadStream(file).pipe(ws)
  }

  var pending = 1
  if (q.thumbnail) pending++

  // Copy original media
  copyFileTo(q.file, mediaPath, function (err) {
    if (err) {
      res.statusCode = 500
      res.end(err.toString())
      return
    }
    if (!--pending) done()
  })

  // Copy thumbnail
  if (q.thumbnail) {
    copyFileTo(q.thumbnail, thumbnailPath, function (err) {
      if (err) {
        res.statusCode = 500
        res.end(err.toString())
        return
      }
      if (!--pending) done()
    })
  }

  function done () {
    if (pending) return
    res.end(JSON.stringify({id: id}))
  }
}

// Tiles
Api.prototype.stylesList = function (req, res, m) {
  var self = this
  res.setHeader('content-type', 'application/json')
  fs.readdir(path.join(self.staticRoot, 'styles'), function (err, files) {
    if (err) {
      res.statusCode = 500
      res.end(err.toString())
      return
    }
    files = files
      .filter(function (file) {
        var stat = fs.statSync(path.join(self.staticRoot, 'styles', file))
        return stat.isDirectory() && fs.existsSync(path.join(self.staticRoot, 'styles', file, 'style.json'))
      })
      .map(function (dir) {
        var str = fs.readFileSync(path.join(self.staticRoot, 'styles', dir, 'style.json'), 'utf-8')
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
  serveStyleFile(path.join(this.staticRoot, 'styles', m.id, 'style.json'), m.id, req, res)
}

Api.prototype.stylesGetStatic = function (req, res, m) {
  ecstatic({
    root: this.staticRoot,
    handleError: false
  })(req, res)
}

Api.prototype.stylesGet = function (req, res, m) {
  var self = this
  var asarPath = path.join(self.staticRoot, 'styles', m.id, 'tiles', m.tileid + '.asar')

  var filename = [m.z, m.y, m.x].join('/') + '.' + m.ext
  var buf = asarGet(asarPath, filename)

  if (buf) {
    var mime
    switch (m.ext) {
      case 'png': mime = 'image/png'; break
      case 'jpg': mime = 'image/jpg'; break
    }
    if (mime) res.setHeader('content-type', mime)

    // Set gzip encoding on {mvt,pbf} tiles.
    if (/mvt|pbf$/.test(m.ext)) res.setHeader('content-encoding', 'gzip')

    res.end(buf)
  } else {
    res.statusCode = 404
    res.end()
  }
}

Api.prototype.syncAnnounce = function (req, res, m) {
  if (!this.browser) this.browser = this.sync.listen(this.opts)
  this.browser.update()
  res.end()
}

Api.prototype.getSyncTargets = function (req, res, m) {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(this.sync.targets()))
}

Api.prototype.syncToTarget = function (req, res, m, params) {
  var self = this
  var progress
  if (params.filename) {
    progress = self.sync.replicateFromFile(params.filename, self.opts)
  } else if (params.host && params.port) {
    progress = self.sync.syncToTarget(params, self.opts)
  } else return onerror(res, 'Requires filename or host and port')

  function onprogress (data) {
    if (data === 'replication-started') send(res, 'replication-started')
    else send(res, 'replication-progress', data)
  }
  progress.on('progress', onprogress)
  progress.on('error', onend)
  progress.on('end', onend)

  function onend (err) {
    if (err) return onerror(res, err.message)
    send(res, 'replication-complete')
    progress.removeListener('progress', onprogress)
    res.end()
  }

  function onerror (res, err) {
    res.statusCode = 500
    var str = JSON.stringify({topic: 'replication-error', message: err.message || err}) + '\n'
    res.end(str)
  }
}

Api.prototype.close = function (cb) {
  this.sync.close(cb)
}

function send (res, topic, msg) {
  var str = JSON.stringify({ topic: topic, message: msg }) + '\n'
  res.write(str)
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

function validateObservation (obs) {
  if (!obs) throw new Error('Observation is undefined')
  if (obs.type !== 'observation') throw new Error('Observation must be of type `observation`')
  if (obs.attachments) {
    if (!Array.isArray(obs.attachments)) throw new Error('Observation attachments must be an array')
    obs.attachments.forEach(function (att, i) {
      if (!att) throw new Error('Attachment at index `' + i + '` is undefined')
      if (typeof att.id !== 'string') throw new Error('Attachment must have a string id property (at index `' + i + '`)')
    })
  }
  if (typeof obs.lat !== 'undefined' || typeof obs.lon !== 'undefined') {
    if (typeof obs.lat === 'undefined' || typeof obs.lon === 'undefined') {
      throw new Error('one of lat and lon are undefined')
    }
    if (typeof obs.lat !== 'number' || typeof obs.lon !== 'number') {
      throw new Error('lon and lat must be a number')
    }
  }
}

var VALID_PROPS = ['lon', 'lat', 'attachments', 'tags', 'ref']

// Filter whitelisted props
function whitelistProps (obs) {
  var newObs = {}
  VALID_PROPS.forEach(function (prop) {
    newObs[prop] = obs[prop]
  })
  return newObs
}
