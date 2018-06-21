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
      t.ok(/^[0-9A-Fa-f]+$/.test(obj.id), 'expected media id response')

      var buf1 = fs.readFileSync('test/data/image.jpg')
      media.createReadStream(obj.id).pipe(concat(function (buf2) {
        t.equals(buf1.toString('hex'), buf2.toString('hex'))

        server.close()
        t.end()
      }))
    }))

    // request
    hq.end()
  })
})
