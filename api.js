var error = require('debug')('mapeo-server:error')
var fs = require('fs')
var path = require('path')
var asar = require('asar')
var body = require('body/json')
var ecstatic = require('ecstatic')
var mime = require('mime')
var randombytes = require('randombytes')

// TODO: pull this code into this module so as not to pull in core code
var MapeoCore = require('@mapeo/core')
var errors = MapeoCore.errors

module.exports = Api

const customMimeTypes = {
  'application/x-protobuf': ['pbf']
}
mime.define(customMimeTypes)

function Api (media, opts) {
  if (!(this instanceof Api)) return new Api(opts)
  if (!opts) opts = {}
  this.opts = opts
  this.media = media

  this.staticRoot = this.opts.staticRoot
  this.ecstatic = ecstatic({
    cache: 60 * 5, // 5 minutes
    mimeTypes: customMimeTypes,
    root: this.staticRoot,
    handleError: false
  })
  if (opts.fallbackPresetsDir) {
    this.ecstaticFallbackPresets = ecstatic({
      cache: 60 * 5, // 5 minutes
      mimeTypes: customMimeTypes,
      root: opts.fallbackPresetsDir,
      baseDir: 'presets',
      handleError: false
    })
  }
}

function handleError (res, err) {
  if (typeof err === 'string') err = new Error(err)
  if (!err.status) err = errors(err)
  errors.send(res, err)
  error(err)
}

// Presets
Api.prototype.presetsList = function (req, res, m) {
  var target = path.join(this.staticRoot, 'presets')
  fs.readdir(target, function (err, files) {
    if (err) return handleError(res, err)
    files = files
      .filter(function (filename) {
        return fs.statSync(path.join(target, filename)).isDirectory()
      })
    res.setHeader('content-type', 'application/json')
    res.end(JSON.stringify(files))
  })
}

Api.prototype.presetsGet = function (req, res, m) {
  this.ecstatic(req, res, (err) => {
    if (err) return handleError(res, err)
    if (this.ecstaticFallbackPresets) {
      this.ecstaticFallbackPresets(req, res, (err) => {
        handleError(res, err || errors.NotFound())
      })
    } else {
      handleError(res, errors.NotFound())
    }
  })
}

// Media
Api.prototype.mediaGet = function (req, res, m) {
  var self = this
  var id = m.type + '/' + m.id

  this.media.exists(id, function (err, exists) {
    if (err) return handleError(res, err)
    if (!exists) return handleError(res, errors.NotFound())
    if (m.id.endsWith('.jpg')) res.setHeader('content-type', 'image/jpeg')
    else if (m.id.endsWith('.png')) res.setHeader('content-type', 'image/png')
    self.media.createReadStream(id).pipe(res)
  })
}

const expectedMediaFormats = ['original', 'preview', 'thumbnail']

Api.prototype.mediaPost = function (req, res, m, q) {
  const self = this
  let pending = expectedMediaFormats.length
  let errorSent = false

  body(req, function (err, media) {
    if (err) return handleError(res, errors.JSONParseError())
    if (!media) return handleError(res, new Error('Empty request body'))

    for (const format of expectedMediaFormats) {
      if (!media[format]) return error(400, new Error(`Request body is missing ${format} property`))
      if (!fs.existsSync(media[format])) return error(400, new Error(`File ${media[format]} does not exist`))
    }

    // Use the extension of the original media - assumes thumbnail and preview
    // is the same format / has the same extension.
    const ext = path.extname(media.original)
    const newMediaId = randombytes(16).toString('hex') + ext

    for (const format of expectedMediaFormats) {
      var destPath = format + '/' + newMediaId
      copyFileTo(media[format], destPath, done)
    }

    function done (err) {
      if (err) return error(500, new Error('There was a problem saving the media to the server'))
      if (--pending) return
      if (errorSent) return

      res.setHeader('content-type', 'application/json')
      res.end(JSON.stringify({ id: newMediaId }))
    }
  })

  function copyFileTo (file, to, cb) {
    var ws = self.media.createWriteStream(to, cb)
    fs.createReadStream(file).pipe(ws)
  }

  function error (code, error) {
    if (errorSent) return
    errorSent = true
    error.status = code
    handleError(res, error)
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
  this.ecstatic(req, res)
}

Api.prototype.stylesGet = function (req, res, m) {
  var self = this
  var ext = m.ext
  var tileid = m.tileid || m.id
  var buf
  var baseFilename = [m.z, m.y, m.x].join(path.sep)
  var asarPath = path.join(self.staticRoot, 'styles', m.id, 'tiles', tileid + '.asar')
  if (ext) buf = asarGet(asarPath, baseFilename + '.' + ext)
  else {
    // Guess the extension
    var guesses = ['png', 'jpg', 'jpeg']
    guesses.every((_ext) => {
      var filename = baseFilename + '.' + _ext
      buf = asarGet(asarPath, filename)
      if (buf) {
        // if the file exists in the asar, lets use that ext
        ext = _ext
        return false
      }
      return true
    })
  }

  // if theres a buffer then the file exists and we know the extension
  if (buf) {
    var mimeType = mime.getType(ext)
    console.log(ext, mimeType)
    if (mimeType) res.setHeader('content-type', mimeType)

    // Set gzip encoding on {mvt,pbf} tiles.
    if (/mvt|pbf$/.test(ext)) res.setHeader('content-encoding', 'gzip')

    res.end(buf)
  } else {
    return handleError(res, errors.NotFound())
  }
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
      res.setHeader('cache-control', 'max-age=' + 5 * 60) // 5 minutes
      res.setHeader('content-length', data.length)
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.statusCode = 200
      res.end(data)
    })
  })
}
