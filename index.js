var staticFiles = require('./staticFiles')
var Api = require('./api')
var Router = require('routes')

module.exports = function (dir) {
  var router = Router()
  var api = Api(dir)

  router.addRoute('POST /observations', api.observationCreate.bind(api))
  router.addRoute('GET /observations', api.observationList.bind(api))
  router.addRoute('PUT /observation/:id', api.observationUpdate.bind(api))
  router.addRoute('GET /observations/:id', api.observationGet.bind(api))
  router.addRoute('GET /features', api.asFeatureCollection.bind(api))

  router.addRoute('GET /media', api.mediaList.bind(api))
  router.addRoute('GET /media/:filename', api.mediaGet.bind(api))
  router.addRoute('GET /static/*', staticFiles)

  return function (req, res) {
    var m = router.match(req.method + ' ' + req.url)
    if (m) {
      m.fn(req, res, m.params)
    }
    else {
      res.statusCode = 404
      res.end('not found')
    }
  }
}
