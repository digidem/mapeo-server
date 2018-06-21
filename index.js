var Router = require('routes')
var Api = require('./api')
var url = require('url')
var querystring = require('querystring')

module.exports = function (osm, media, opts) {
  var router = Router()
  var api = Api(osm, media, opts)

  // Observations
  router.addRoute('GET /observations',         api.observationList.bind(api))
  router.addRoute('GET /observations/:id',     api.observationGet.bind(api))
  router.addRoute('POST /observations',        api.observationCreate.bind(api))
  router.addRoute('PUT /observations/:id',     api.observationUpdate.bind(api))
  router.addRoute('DELETE /observations/:id',  api.observationDelete.bind(api))
  router.addRoute('PUT /observations/to-element/:id', api.observationConvert.bind(api))

  // Presets
  router.addRoute('GET /presets',              api.presetsList.bind(api))
  router.addRoute('GET /presets/:id/*',        api.presetsGet.bind(api))

  // Media
  router.addRoute('GET /media/:id',            api.mediaGet.bind(api))
  router.addRoute('PUT /media',                api.mediaPut.bind(api))

  // Styles 'n Tiles
  router.addRoute('GET /styles',               api.stylesList.bind(api))
  router.addRoute('GET /styles/:id/tiles/:tileid/:z/:y/:x.:ext',
                                               api.stylesGet.bind(api))
  router.addRoute('GET /styles/:id/style.json',api.stylesGetStyle.bind(api))
  router.addRoute('GET /styles/:id/*',         api.stylesGetStatic.bind(api))

  // Sync
  router.addRoute('GET /sync/start',           api.syncToTarget.bind(api))
  router.addRoute('GET /sync/targets',         api.getSyncTargets.bind(api))
  router.addRoute('GET /sync/announce',        api.syncAnnounce.bind(api))

  return {
    api,
    handle: function (req, res) {
      var parsed = url.parse(req.url)
      var q = querystring.parse(parsed.query)
      var m = router.match(req.method + ' ' + parsed.pathname)
      if (m) {
        m.fn(req, res, m.params, q)
        return true
      } else {
        return false
      }
    }
  }
}
