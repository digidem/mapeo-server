var test = require('tape')
var hyperquest = require('hyperquest')
var {createServer} = require('./server')
var concat = require('concat-stream')

test('device: get id', function (t) {

  createServer(function (server, base, osm, media) {
    var href = base + '/device/id'
    var expected

    osm.ready(function () {
      expected = osm.writer.key.toString('hex')
      check()
    })

    function check () {
      var hq = hyperquest.get(href, {
        headers: { 'content-type': 'application/json' }
      })

      // http response
      hq.once('response', function (res) {
        t.equal(res.statusCode, 200, 'Request error')
        t.equal(res.headers['content-type'], 'application/json', 'type correct')
      })

      // response content
      hq.pipe(concat({ encoding: 'string' }, function (body) {
        try {
          var key = JSON.parse(body)
          t.deepEqual(JSON.parse(body), expected, 'Expected error response')
          server.close()
          t.end()
        } catch (e) {
          t.error(e)
        }
      }))
    }
  })
})

