var test = require('tape')
var hyperquest = require('hyperquest')
var createServer = require('./server')
var concat = require('concat-stream')

test('media: upload', function (t) {
  createServer(function (server, base) {
    var href = base + '/media'

    var image1x1 = new Buffer('89504e470d0a1a0a0000000d4948445200000001000000010802000000907753de000000097048597300000b1300000b1301009a9c180000000774494d4507e204141320381e45f7340000001d69545874436f6d6d656e7400000000004372656174656420776974682047494d50642e65070000000c4944415408d763f8ffff3f0005fe02fedccc59e70000000049454e44ae426082', 'hex')

    var hq = hyperquest.post(href, {
      headers: { 'content-type': 'image/png' }
    })

    // http response
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'create 200 ok')
      t.equal(res.headers['content-type'], 'application/json', 'type correct')
    })

    // response content
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      var obj = JSON.parse(body)
      t.ok(/^[0-9A-Fa-f]+$/.test(obj.id), 'expected media id response')

      server.close()
      t.end()
    }))

    // request
    hq.end(image1x1)
  })
})

