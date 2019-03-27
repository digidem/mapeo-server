var test = require('tape')
var hyperquest = require('hyperquest')
var {announce, unannounce, createServer, twoServers} = require('./server')
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
      t.ok(/^[0-9A-Fa-f]+.jpg$/.test(obj.id), 'expected media id response')

      var data = fs.readFileSync('test/data/image.jpg')
      hq = hyperquest.get(base + '/media/original/' + obj.id)
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

test('media: upload + get when file doesnt exist', function (t) {
  createServer(function (server, base, osm, media) {
    var fpath = encodeURIComponent('test/data/this-file-doesnt-exist.jpg')
    var href = base + '/media?file=' + fpath

    var hq = hyperquest.put(href, {})

    // http response
    hq.once('response', function (res) {
      t.equal(res.statusCode, 500, 'create 500 bad')
      t.equal(res.headers['content-type'], 'application/json', 'type correct')
    })

    // response content
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      var obj = JSON.parse(body)
      t.ok(obj.error)
      server.close()
      t.end()
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
      t.ok(/^[0-9A-Fa-f]+.jpg$/.test(obj.id), 'expected media id response')

      var buf1 = fs.readFileSync('test/data/image.jpg')
      media.createReadStream('original/' + obj.id).pipe(concat(function (buf2) {
        t.equals(buf1.toString('hex'), buf2.toString('hex'))
        media.createReadStream('thumbnail/' + obj.id).pipe(concat(function (buf3) {
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

test('media: upload + get with media mode: mobile', function (t) {
  twoServers({
    a: { opts: { deviceType: 'mobile' } },
    b: { opts: { deviceType: 'mobile' } }
  }, function (a, b) {
    var fpath = encodeURIComponent('test/data/image.jpg')
    var href = a.base + '/media?file=' + fpath + '&thumbnail=' + fpath

    var hq = hyperquest.put(href, {})
    var obj

    // http response
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'create 200 ok')
      t.equal(res.headers['content-type'], 'application/json', 'type correct')
    })
    a.router.api.core.sync.on('target', function () {
      var targets = a.router.api.core.sync.targets()
      sync(targets[0])
    })

    // response content
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      obj = JSON.parse(body)
      t.ok(/^[0-9A-Fa-f]+.jpg$/.test(obj.id), 'expected media id response')
      announce(a, b, function (err) { t.error(err) })
    }))

    function sync (target) {
      var href = a.base + `/sync/start?host=${target.host}&port=${target.port}`
      var hq = hyperquest.get(href, {})
      hq.once('response', function (res) {
        t.equal(res.statusCode, 200, 'sync 200 ok')
        res.on('end', check)
      })
    }

    function done () {
      unannounce(a, b, function (err) {
        t.error(err)
        a.server.close()
        b.server.close()
        t.end()
      })
    }

    function check () {
      var buf1 = fs.readFileSync('test/data/image.jpg')
      a.media.createReadStream('original/' + obj.id).pipe(concat(function (buf2) {
        t.equals(buf1.toString('hex'), buf2.toString('hex'))
        a.media.createReadStream('thumbnail/' + obj.id).pipe(concat(function (buf3) {
          t.equals(buf1.toString('hex'), buf3.toString('hex'))
          b.media.exists('original/' + obj.id, function (err, exists) {
            t.error(err, 'no error')
            t.notOk(exists, 'media does not exist')
            done()
          })
        }))
      }))
    }

    // request
    hq.end()
  })
})

test('media: upload + get with media mode: mobile<->desktop', function (t) {
  twoServers({
    a: { opts: { deviceType: 'mobile' } },
    b: { opts: { deviceType: 'desktop' } }
  }, function (a, b) {
    var fpath = encodeURIComponent('test/data/image.jpg')
    var href = a.base + '/media?file=' + fpath + '&thumbnail=' + fpath
    announce(a, b, function (err) { t.error(err) })

    var hq = hyperquest.put(href, {})
    var obj

    // http response
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'create 200 ok')
      t.equal(res.headers['content-type'], 'application/json', 'type correct')
    })

    // response content
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      obj = JSON.parse(body)
      t.ok(/^[0-9A-Fa-f]+.jpg$/.test(obj.id), 'expected media id response')
      a.router.api.core.sync.on('target', function () {
        var targets = a.router.api.core.sync.targets()
        sync(targets[0])
      })
    }))

    // request
    hq.end()

    function sync (target) {
      var href = a.base + `/sync/start?host=${target.host}&port=${target.port}`
      var hq = hyperquest.get(href, {})
      hq.once('response', function (res) {
        t.equal(res.statusCode, 200, 'sync 200 ok')
        res.on('end', check)
      })
    }

    function done () {
      unannounce(a, b, function (err) {
        t.error(err)
        a.server.close()
        b.server.close()
        t.end()
      })
    }

    function check () {
      var buf1 = fs.readFileSync('test/data/image.jpg')
      a.media.createReadStream('original/' + obj.id).pipe(concat(function (buf2) {
        t.equals(buf1.toString('hex'), buf2.toString('hex'), 'original is correct on server1')
        a.media.createReadStream('thumbnail/' + obj.id).pipe(concat(function (buf3) {
          t.equals(buf1.toString('hex'), buf3.toString('hex'), 'thumbnail is correct on server1')
          b.media.createReadStream('original/' + obj.id).pipe(concat(function (buf4) {
            t.equals(buf1.toString('hex'), buf4.toString('hex'), 'original is correct on server2')
            done()
          }))
        }))
      }))
    }
  })
})
