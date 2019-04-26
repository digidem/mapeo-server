var test = require('tape')
var hyperquest = require('hyperquest')
var {createServer} = require('./server')
var concat = require('concat-stream')
var fs = require('fs')
var path = require('path')

test('presets: list', function (t) {
  createServer(function (server, base) {
    var href = base + '/presets'

    var hq = hyperquest.get(href, {})

    // http response
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'create 200 ok')
      t.equal(res.headers['content-type'], 'application/json', 'type correct')
    })

    // response content
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      try {
        var obj = JSON.parse(body)
        var expected = ['jungle']
        t.deepEquals(obj, expected)
      } catch (e) {
        t.error(e, 'json parsing exception!')
      }
      server.close()
      t.end()
    }))
  })
})

test('presets: get', function (t) {
  createServer(function (server, base) {
    var expected = fs.readFileSync(path.join(__dirname, '..', 'presets', 'jungle', 'icons.svg'), 'utf-8')
    var href = base + '/presets/jungle/icons.svg'
    var hq = hyperquest.get(href)
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'get 200 ok')
      t.ok(/image\/svg\+xml/.test(res.headers['content-type']), 'type correct')

      hq.pipe(concat(function (body) {
        t.equals(body.toString(), expected)
        server.close()
        t.end()
      }))
    })
    hq.once('error', function (err) {
      t.error(err, 'no http error')
    })
  })
})

test('presets: 404', function (t) {
  createServer(function (server, base) {
    var href = base + '/presets/unknown_id/missing.json'
    var hq = hyperquest.get(href)
    hq.once('response', function (res) {
      t.equal(res.statusCode, 404, 'get 404 ok')
      t.ok(/application\/json/.test(res.headers['content-type']), 'type correct')

      hq.pipe(concat(function (body) {
        t.deepEquals(JSON.parse(body.toString()), { error: 'Not Found', status: 404 })
        server.close()
        t.end()
      }))
    })
    hq.once('error', function (err) {
      t.error(err, 'no http error')
    })
  })
})

test('presets: get default passthrough', function (t) {
  createServer({
    port: 5000,
    fallbackPresetsDir: path.join(__dirname, '..', 'presets'),
    staticRoot: __dirname
  }, function (server, base) {
    var expected = fs.readFileSync(path.join(__dirname, '..', 'presets', 'jungle', 'icons.svg'), 'utf-8')
    var href = base + '/presets/jungle/icons.svg'
    var hq = hyperquest.get(href)
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'get 200 ok')
      t.ok(/image\/svg\+xml/.test(res.headers['content-type']), 'type correct')

      hq.pipe(concat(function (body) {
        t.equals(body.toString(), expected)
        server.close()
        t.end()
      }))
    })
    hq.once('error', function (err) {
      t.error(err, 'no http error')
    })
  })
})
