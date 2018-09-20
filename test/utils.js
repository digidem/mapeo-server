var hyperquest = require('hyperquest')
var concat = require('concat-stream')

module.exports = {
  check,
  postJson,
  putJson,
  getJson,
  delJson
}

function check (t, href, expected, done) {
  var hq = hyperquest.get(href, {
    headers: { 'content-type': 'application/json' }
  })

  // http response
  hq.once('response', function (res) {
    t.equal(res.statusCode, 200, 'create 200 ok')
    t.equal(res.headers['content-type'], 'application/json', 'type correct')
  })

  // response content
  hq.pipe(concat({ encoding: 'string' }, function (body) {
    try {
      var objs = JSON.parse(body)
      t.deepEquals(objs, expected, 'observation from server matches expected')
    } catch (e) {
      t.error(e, 'json parsing exception!')
    }
    done()
  }))
}

function postJson (href, data, cb) {
  var hq = hyperquest.post(href, { headers: { 'content-type': 'application/json' } })
  hq.on('response', function (res) {
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      cb(JSON.parse(body))
    }))
  })
  hq.end(data)
}

function putJson (href, cb) {
  var hq = hyperquest.put(href, { headers: { 'content-type': 'application/json' } })
  hq.on('response', function (res) {
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      cb(JSON.parse(body))
    }))
  })
  hq.end()
}

function getJson (href, cb) {
  var hq = hyperquest.get(href, { headers: { 'content-type': 'application/json' } })
  hq.on('response', function (res) {
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      cb(JSON.parse(body))
    }))
  })
}

function delJson (href, cb) {
  var hq = hyperquest.delete(href, { headers: { 'content-type': 'application/json' } })
  hq.on('response', function (res) {
    hq.pipe(concat({ encoding: 'string' }, function (body) {
      cb(JSON.parse(body))
    }))
  })
  hq.end()
}

