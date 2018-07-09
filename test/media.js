var test = require('tape')
var hyperquest = require('hyperquest')
var createServer = require('./server')
var concat = require('concat-stream')
var fs = require('fs')

test('media: upload + get', function (t) {
  createServer(function (server, base, osm, media) {
    var fpath = encodeURIComponent('test/data/image.jpg')
    var href = base + '/media?file=' + fpath

    var hq = hyperquest.put(href, {})

    // http response
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'create 200 ok')
      t.equal(res.headers['content-type'], 'application/json', 'type correct')
    })

    // response content
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      var obj = JSON.parse(body)
      t.ok(/^original\/[0-9A-Fa-f]+.jpg$/.test(obj.original), 'expected media id response')
      t.notOk(obj.thumbnail, 'thumbnail id not set')

      var data = fs.readFileSync('test/data/image.jpg')
      hq = hyperquest.get(base + '/media/' + obj.original)
      hq.once('response', function (res) {
        t.equal(res.statusCode, 200, 'get 200 ok')
        t.equal(res.headers['content-type'], 'image/jpeg', 'type correct')
        res.pipe(concat(function (buf) {
          t.equals(buf.toString('hex'), data.toString('hex'), 'image data matches')
          server.close()
          t.end()
        }))
      })
    }))

    // request
    hq.end()
  })
})

test('media: upload + get with thumbnail', function (t) {
  createServer(function (server, base, osm, media) {
    var fpath = encodeURIComponent('test/data/image.jpg')
    var href = base + '/media?file=' + fpath + '&thumbnail=' + fpath

    var hq = hyperquest.put(href, {})

    // http response
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'create 200 ok')
      t.equal(res.headers['content-type'], 'application/json', 'type correct')
    })

    // response content
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      var obj = JSON.parse(body)
      t.ok(/^original\/[0-9A-Fa-f]+.jpg$/.test(obj.original), 'expected media id response')
      t.ok(/^thumbnail\/[0-9A-Fa-f]+.jpg$/.test(obj.thumbnail), 'expected thumbnail id response')

      var buf1 = fs.readFileSync('test/data/image.jpg')
      media.createReadStream(obj.original).pipe(concat(function (buf2) {
        t.equals(buf1.toString('hex'), buf2.toString('hex'))
        media.createReadStream(obj.original).pipe(concat(function (buf3) {
          t.equals(buf1.toString('hex'), buf3.toString('hex'))

          server.close()
          t.end()
        }))
      }))
    }))

    // request
    hq.end()
  })
})
