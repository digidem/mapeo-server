var test = require('tape')
var path = require('path')
var hyperquest = require('hyperquest')
var { listen, join, destroy, createServer, twoServers } = require('./server')
var concat = require('concat-stream')
var collect = require('collect-stream')
var fs = require('fs')

function getData (filename) {
  return fs.readFileSync(filename.replace(/\//g, path.sep))
}

test('media: upload + get with missing thumbnail', function (t) {
  createServer(function (server, base, osm, media) {
    var fpath = 'test/data/image.jpg'
    var href = base + '/media'

    var hq = hyperquest.post(href, {
      headers: { 'content-type': 'application/json' }
    })

    // http response
    hq.once('response', function (res) {
      t.equal(res.statusCode, 400, 'Request error')
      t.equal(res.headers['content-type'], 'application/json', 'type correct')
    })

    // response content
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      var expected = {
        error: 'Request body is missing preview property',
        status: 400
      }
      t.deepEqual(JSON.parse(body), expected, 'Expected error response')
      server.close()
      t.end()
    }))

    // request
    hq.end(JSON.stringify({
      original: fpath
    }))
  })
})

test('media: upload + get when file doesnt exist', function (t) {
  createServer(function (server, base, osm, media) {
    var fpath = 'test/data/this-file-doesnt-exist.jpg'
    var href = base + '/media'

    var hq = hyperquest.post(href, {
      headers: { 'content-type': 'application/json' }
    })

    // http response
    hq.once('response', function (res) {
      t.equal(res.statusCode, 400, 'create 400 bad')
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
    hq.end(JSON.stringify({
      original: fpath
    }))
  })
})

test('media: upload + get with thumbnail + preview', function (t) {
  createServer(function (server, base, osm, media) {
    var fpath = 'test/data/image.jpg'
    var href = base + '/media'
    var mediaFormats = ['original', 'preview', 'thumbnail']
    var pending = 0

    var hq = hyperquest.post(href, {
      headers: { 'content-type': 'application/json' }
    })

    // http response
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'create 200 ok')
      t.equal(res.headers['content-type'], 'application/json', 'type correct')
    })

    // response content
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      var obj = JSON.parse(body)
      t.ok(/^[0-9A-Fa-f]+.jpg$/.test(obj.id), 'expected media id response')

      var expectedBuf = getData('test/data/image.jpg')
      mediaFormats.forEach(format => {
        pending++
        var key = format + '/' + obj.id
        collect(media.createReadStream(key), (err, buf) => {
          t.error(err, format + ' media exists')
          t.ok(buf.equals(expectedBuf), format + ' media is correctly created')
          done()
        })
      })
    }))

    function done () {
      if (--pending) return
      t.end()
      server.close()
    }

    // request
    hq.end(JSON.stringify({
      original: fpath,
      thumbnail: fpath,
      preview: fpath
    }))
  })
})

test('media: upload + get with media mode: mobile', function (t) {
  twoServers({
    a: { opts: { deviceType: 'mobile' } },
    b: { opts: { deviceType: 'mobile' } }
  }, function (a, b) {
    var fpath = 'test/data/image.jpg'
    var href = a.base + '/media'

    var hq = hyperquest.post(href, {})
    var obj

    // http response
    hq.once('response', function (res) {
      t.equal(res.statusCode, 200, 'create 200 ok')
      t.equal(res.headers['content-type'], 'application/json', 'type correct')
    })
    a.router.api.core.sync.on('peer', function () {
      var peers = a.router.api.core.sync.peers()
      sync(peers[0])
    })

    // response content
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      obj = JSON.parse(body)
      t.ok(/^[0-9A-Fa-f]+.jpg$/.test(obj.id), 'expected media id response')
      listen(a, b, function (err) {
        t.error(err)
        join(a, b, function (err) {
          t.error(err)
        })
      })
    }))

    function sync (peer) {
      var href = a.base + `/sync/start?host=${peer.host}&port=${peer.port}`
      var hq = hyperquest.get(href, {})
      hq.once('response', function (res) {
        t.equal(res.statusCode, 200, 'sync 200 ok')
        res.on('end', check)
      })
    }

    var pending = 6
    function done () {
      if (--pending) return
      destroy(a, b, function (err) {
        t.error(err)
        a.server.close()
        b.server.close()
        t.end()
      })
    }

    function check () {
      var buf1 = getData('test/data/image.jpg')
      checkFile(t, 'Original created on server A', a.media.createReadStream('original/' + obj.id), buf1, done)
      checkFile(t, 'Preview created on server A', a.media.createReadStream('preview/' + obj.id), buf1, done)
      checkFile(t, 'Thumbnail created on server A', a.media.createReadStream('thumbnail/' + obj.id), buf1, done)
      checkFile(t, 'Preview synced to server B', b.media.createReadStream('preview/' + obj.id), buf1, done)
      checkFile(t, 'Thumbnail synced to server B', b.media.createReadStream('thumbnail/' + obj.id), buf1, done)
      b.media.exists('original/' + obj.id, function (err, exists) {
        t.error(err, 'no error')
        t.notOk(exists, 'original did not sync')
        done()
      })
    }

    // request
    hq.end(JSON.stringify({
      original: fpath,
      thumbnail: fpath,
      preview: fpath
    }))
  })
})

test('media: upload + get with media mode: mobile<->desktop', function (t) {
  twoServers({
    a: { opts: { deviceType: 'mobile' } },
    b: { opts: { deviceType: 'desktop' } }
  }, function (a, b) {
    var fpath = 'test/data/image.jpg'
    var href = a.base + '/media'
    listen(a, b, function (err) {
      t.error(err)
      join(a, b, function (err) {
        t.error(err)
      })
    })

    var hq = hyperquest.post(href, {})
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
      a.router.api.core.sync.on('peer', function () {
        var peers = a.router.api.core.sync.peers()
        sync(peers[0])
      })
    }))

    // request
    hq.end(JSON.stringify({
      original: fpath,
      thumbnail: fpath,
      preview: fpath
    }))

    function sync (peer) {
      var href = a.base + `/sync/start?host=${peer.host}&port=${peer.port}`
      var hq = hyperquest.get(href, {})
      hq.once('response', function (res) {
        t.equal(res.statusCode, 200, 'sync 200 ok')
        res.on('end', check)
      })
    }

    var pending = 6
    function done () {
      if (--pending) return
      destroy(a, b, function (err) {
        t.error(err)
        a.server.close()
        b.server.close()
        t.end()
      })
    }

    function check () {
      var buf1 = getData('test/data/image.jpg')
      checkFile(t, 'Original created on server A', a.media.createReadStream('original/' + obj.id), buf1, done)
      checkFile(t, 'Preview created on server A', a.media.createReadStream('preview/' + obj.id), buf1, done)
      checkFile(t, 'Thumbnail created on server A', a.media.createReadStream('thumbnail/' + obj.id), buf1, done)
      checkFile(t, 'Original synced to server B', b.media.createReadStream('original/' + obj.id), buf1, done)
      checkFile(t, 'Preview synced to server B', b.media.createReadStream('preview/' + obj.id), buf1, done)
      checkFile(t, 'Thumbnail synced to server B', b.media.createReadStream('thumbnail/' + obj.id), buf1, done)
    }
  })
})

function checkFile (t, msg, readStream, expectedBuf, cb) {
  collect(readStream, (err, buf) => {
    t.error(err, 'read without error')
    t.ok(buf.equals(expectedBuf), msg)
    cb()
  })
}
