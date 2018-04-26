var Router = require('routes')
var Api = require('./api')
var url = require('url')
var fs = require('fs')
var ecstatic = require('ecstatic')

module.exports = function (osm, media) {
  var router = Router()
  var api = Api(osm, media)

  // Observations
  router.addRoute('GET /observations',      api.observationList.bind(api))
  router.addRoute('GET /observations/:id',  api.observationGet.bind(api))
  router.addRoute('POST /observations',     api.observationCreate.bind(api))
  router.addRoute('PUT /observations/:id',  api.observationUpdate.bind(api))

  // Presets
  router.addRoute('GET /presets',           api.presetsList.bind(api))
  router.addRoute('GET /presets/:id',       api.presetsGet.bind(api))

  // Media
  router.addRoute('GET /media/:id',         api.mediaGet.bind(api))
  router.addRoute('POST /media',            api.mediaPost.bind(api))

  // Tiles
  router.addRoute('GET /tiles',             api.tilesList.bind(api))
  router.addRoute('GET /tiles/:id/:z/:y/:x',api.tilesGet.bind(api))

  // Sync
  router.addRoute('GET /sync/adb',          api.syncAdb.bind(api))

  return function (req, res) {
    var m = router.match(req.method + ' ' + req.url)

    if (url.parse(req.url).pathname === '/sat-style/style.json') {
      serveStyleFile('sat-style/style.json', req, res)
    } else if (m) {
      m.fn(req, res, m.params)
    } else {
      ecstatic({
        root: __dirname,
        handleError: false,
      })(req, res)
    }
  }
}

function serveStyleFile (styleFile, req, res) {
  fs.stat(styleFile, function (err, stat) {
    if (err) console.error(err)
    fs.readFile(styleFile, 'utf8', function (err, data) {
      if (err) console.error(err)
      data = Buffer.from(data.replace(/\{host\}/gm, 'http://' + req.headers.host + '/sat-style'))
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
