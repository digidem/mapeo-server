var fs = require('fs')
var querystring = require('querystring')
var sync = require('mapeo-sync')
var path = require('path')
var url = require('url')
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
  this.root = opts.root || '.'
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
      var opts = {}
      if (obses.length > 1) {
        obses = obses.sort(function (a, b) {
          return b.created_at_timestamp - a.created_at_timestamp
        })
        opts.links = obses[0].id
      }
      var old = obses[0]
      var newObs = Object.assign(old, obs)
      self.osm.put(m.id, newObs, opts, function (err, node) {
        if (err) {
          res.statusCode = 500
          res.end('failed to update observation:' + err.toString())
          return
        }
        res.setHeader('content-type', 'application/json')
        newObs.id = node.value.k
        newObs.version = node.key
        res.end(JSON.stringify(newObs))
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
  fs.readdir(path.join(self.root, 'presets'), function (err, files) {
    if (err) {
      res.statusCode = 500
      res.end(err.toString())
      return
    }
    files = files
      .filter(function (filename) {
        return fs.statSync(path.join(self.root, 'presets', filename)).isDirectory()
      })
    res.end(JSON.stringify(files))
  })
}

Api.prototype.presetsGet = function (req, res, m) {
  var self = this
  var pathname = url.parse(req.url).pathname

  ecstatic({
    root: self.root,
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
  var self = this
  res.setHeader('content-type', 'application/json')
  fs.readdir(path.join(self.root, 'styles'), function (err, files) {
    if (err) {
      res.statusCode = 500
      res.end(err.toString())
      return
    }
    files = files
      .filter(function (file) {
        var stat = fs.statSync(path.join('styles', file))
        return stat.isDirectory() && fs.existsSync(path.join(self.root, 'styles', file, 'style.json'))
      })
      .map(function (dir) {
        var str = fs.readFileSync(path.join(self.root, 'styles', dir, 'style.json'), 'utf-8')
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
  serveStyleFile(path.join(this.root, 'styles', m.id, 'style.json'), m.id, req, res)
}

Api.prototype.stylesGetStatic = function (req, res, m) {
  var self = this
  var pathname = url.parse(req.url).pathname

  ecstatic({
    root: self.root,
    handleError: false,
  })(req, res)
}

Api.prototype.stylesGet = function (req, res, m) {
  var self = this
  var asarPath = path.join(self.root, 'styles', m.id, 'tiles', m.tileid + '.asar')

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

Api.prototype.syncAnnounce = function (req, res, m) {
  if (!this.browser) this.browser = this.sync.listen(this.opts)
  this.browser.update()
  res.end()
}

Api.prototype.getSyncTargets = function (req, res, m) {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(this.sync.targets))
}

Api.prototype.syncToTarget = function (req, res, m) {
  var self = this
  var query = url.parse(req.url).query
  if (!query) return onerror(res, 'Requires filename or host and port')
  var params = querystring.parse(query)
  var progress
  if (params.filename) {
    progress = self.sync.replicateFromFile(params.filename)
  } else if (params.host && params.port) {
    progress = self.sync.syncToTarget(params)
  } else return onerror(res, 'Requires filename or host and port')

  send(res, 'replication-started')
  function onprogress (data) {
    send(res, 'replication-progress', data)
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
    res.statusCode = 400
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
