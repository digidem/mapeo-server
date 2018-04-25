var Router = require('routes')
var Api = require('./api')

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
    if (m) {
      m.fn(req, res, m.params)
      return true
    } else {
      return false
    }
  }
}
