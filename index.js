var Router = require('routes')
var url = require('url')
var querystring = require('querystring')

var Api = require('./api')

module.exports = function (media, opts) {
  var router = Router()
  var api = Api(media, opts)

  // Presets
  router.addRoute('GET /presets', api.presetsList.bind(api))
  router.addRoute('GET /presets/:id/*', api.presetsGet.bind(api))

  // Media
  router.addRoute('GET /media/:type/:id', api.mediaGet.bind(api))
  router.addRoute('POST /media', api.mediaPost.bind(api))

  // Styles 'n Tiles
  router.addRoute('GET /styles', api.stylesList.bind(api))
  router.addRoute('GET /styles/:id/tiles/:tileid/:z/:y/:x.:ext',
    api.stylesGet.bind(api))
  router.addRoute('GET /styles/:id/tiles/:tileid/:z/:y/:x',
    api.stylesGet.bind(api))

  // Here, id is assumed to be the same as tileid
  router.addRoute('GET /styles/:id/tiles/:z/:y/:x.:ext',
    api.stylesGet.bind(api))
  router.addRoute('GET /styles/:id/tiles/:z/:y/:x',
    api.stylesGet.bind(api))

  router.addRoute('GET /styles/:id/style.json', api.stylesGetStyle.bind(api))
  router.addRoute('GET /styles/:id/*', api.stylesGetStatic.bind(api))

  return {
    api,
    handle: function (req, res) {
      var parsed = url.parse(req.url) // eslint-disable-line node/no-deprecated-api
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
