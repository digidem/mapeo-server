var error = require('debug')('mapeo-server:error')
var fs = require('fs')
var path = require('path')
var body = require('body/json')
var randombytes = require('randombytes')
var asar = require('asar')
var ecstatic = require('ecstatic')
var Core = require('mapeo-core')
var errors = Core.errors

module.exports = Api

function Api (osm, media, opts) {
  if (!(this instanceof Api)) return new Api(osm, media, opts)
  if (!opts) opts = {}
  var defaultOpts = {
    id: 'MapeoDesktop_' + randombytes(8).toString('hex'),
    staticRoot: '.'
  }
  this.opts = Object.assign(defaultOpts, opts)
  this.staticRoot = this.opts.staticRoot
  this.core = new Core(osm, media, this.opts)
  this.core.on('error', function (err) {
    error(err)
  })
}

function handleError (res, err) {
  if (typeof err === 'string') err = new Error(err)
  if (!err.status) err = errors(err)
  errors.send(res, err)
  error(err)
}

// Observations
Api.prototype.observationDelete = function (req, res, m) {
  var self = this
  self.core.observationDelete(m.id, function (err) {
    if (err) return handleError(res, err)
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({deleted: true}))
  })
}

Api.prototype.observationList = function (req, res, m) {
  this.core.observationList(function (err, results) {
    if (err) return handleError(res, errors(err))
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(results))
  })
}

Api.prototype.observationGet = function (req, res, m) {
  this.core.observationGet(m.id, function (err, obses) {
    if (err) return handleError(res, err)
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(obses))
  })
}

Api.prototype.observationCreate = function (req, res, m) {
  var self = this

  body(req, function (err, obs) {
    if (err) return handleError(res, errors.JSONParseError())

    self.core.observationCreate(obs, function (err, newObs) {
      if (err) return handleError(res, err)
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(newObs))
    })
  })
}

Api.prototype.observationUpdate = function (req, res, m) {
  var self = this

  body(req, function (err, newObs) {
    if (err) return handleError(res, errors.JSONParseError())

    if (newObs.id !== m.id) return handleError(res, errors.TypeMismatch(newObs.id, m.id))

    self.core.observationUpdate(newObs, function (err, finalObs) {
      if (err) return handleError(res, err)
      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify(finalObs))
    })
  })
}

Api.prototype.observationConvert = function (req, res, m) {
  this.core.observationConvert(m.id, function (err, id) {
    if (err) return handleError(res, err)
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify({ id }))
  })
}

// Presets
Api.prototype.presetsList = function (req, res, m) {
  this.core.presetsList(path.join(this.staticRoot, 'presets'), function (err, files) {
    if (err) return handleError(res, err)
    res.setHeader('content-type', 'application/json')
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

  this.core.media.exists(id, function (err, exists) {
    if (err) return handleError(res, err)
    if (!exists) return handleError(res, errors.NotFound())
    if (m.id.endsWith('.jpg')) res.setHeader('content-type', 'image/jpeg')
    else if (m.id.endsWith('.png')) res.setHeader('content-type', 'image/png')
    self.core.media.createReadStream(id).pipe(res)
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
    var ws = self.core.media.createWriteStream(to, cb)
    fs.createReadStream(file).pipe(ws)
  }

  var pending = 1
  if (q.thumbnail) pending++

  // Copy original media
  copyFileTo(q.file, mediaPath, function (err) {
    if (err) return handleError(res, err)
    if (!--pending) done()
  })

  // Copy thumbnail
  if (q.thumbnail) {
    copyFileTo(q.thumbnail, thumbnailPath, function (err) {
      if (err) return handleError(res, err)
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
    if (err) return handleError(res, err)
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

  var filename = [m.z, m.y, m.x].join(path.sep) + '.' + m.ext
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
    return handleError(res, errors.NotFound())
  }
}

Api.prototype.syncClose = function (req, res, m) {
  this.core.sync.unannounce(function () {
    res.end()
  })
}

Api.prototype.syncAnnounce = function (req, res, m) {
  this.core.sync.announce(function () {
    res.end()
  })
}

Api.prototype.getSyncTargets = function (req, res, m) {
  res.setHeader('Content-Type', 'application/json')
  res.end(JSON.stringify(this.core.sync.targets()))
}

Api.prototype.syncToTarget = function (req, res, m, params) {
  var self = this
  var progress
  if (params.filename) {
    progress = self.core.sync.replicateFromFile(params.filename, self.opts)
  } else if (params.host && params.port) {
    progress = self.core.sync.syncToTarget(params, self.opts)
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
  this.core.sync.close(cb)
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
