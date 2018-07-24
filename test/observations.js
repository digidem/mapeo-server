var test = require('tape')
var hyperquest = require('hyperquest')
var createServer = require('./server')
var concat = require('concat-stream')

test('observations: create', function (t) {
  createServer(function (server, base) {
    var href = base + '/observations'

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
      try {
        var obj = JSON.parse(body)
        t.ok(obj.id, 'id field set')
        t.ok(obj.version, 'version field set')
        t.ok(obj.timestamp, 'timestamp field set')
      } catch (e) {
        t.error(e, 'json parsing exception!')
      }
      server.close()
      t.end()
    }))

    hq.end(JSON.stringify({lat: 5, lon: -0.123, type: 'observation'}))
  })
})

test('observations: create + delete', function (t) {
  createServer(function (server, base) {
    var data = JSON.stringify({lat: 5, lon: -0.123, type: 'observation'})

    postJson(base + '/observations', data, function (err, obs) {
      t.error(err)
      t.ok(obs.id, 'id field set')
      t.ok(obs.version, 'version field set')
      t.ok(obs.timestamp, 'timestamp field set')

      delJson(`${base}/observations/${obs.id}`, function (err) {
        t.error(err)

        getJson(`${base}/observations/${obs.id}`, function (err, obses) {
          t.error(err)
          t.equals(obses.length, 1)
          t.ok(obses[0].deleted)

          server.close()
          t.end()
        })
      })
    })
  })
})

test('observations: create + get', function (t) {
  createServer(function (server, base, osm, media) {
    osm.create({lat:1,lon:2,type:'observation'}, function (err, id, node) {
      t.error(err)

      var expected = {
        lat: 1,
        lon: 2,
        id: id,
        type: 'observation',
        version: node.key
      }

      var href = base + '/observations/' + id

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
          t.equals(objs.length, 1)
          t.deepEquals(objs[0], expected, 'observation from server matches expected')
        } catch (e) {
          t.error(e, 'json parsing exception!')
        }
        server.close()
        t.end()
      }))
    })
  })
})

test('observations: create + list', function (t) {
  createServer(function (server, base, osm, media) {
    osm.create({lat:1,lon:2,type:'observation'}, function (err, id, node) {
      t.error(err)

      // create a fork of the above observation
      var obs2 = {lat:2,lon:2,type:'observation'}
      osm.batch([{type:'put',key:id,links:[],value:obs2}], function (err, nodes) {
        t.error(err)
        var expected = [
          {
            lat: 1,
            lon: 2,
            id: id,
            type: 'observation',
            version: node.key
          },
          {
            lat: 2,
            lon: 2,
            id: id,
            type: 'observation',
            version: nodes[0].key
          }
        ]
        var href = base + '/observations'
        check(t, href, expected, function () {
          server.close()
          t.end()
        })
      })
    })
  })
})

test('observations: update lat/lon', function (t) {
  var original = {
    lat: 1,
    lon: 2,
    type: 'observation',
    timestamp: new Date().toISOString()
  }
  var update = {
    lat: 1.5,
    lon: 2,
    type: 'observation'
  }
  var expected = {
    lat: 1.5,
    lon: 2,
    type: 'observation'
  }
  testUpdateObservation(t, original, update, expected, function () {
    t.end()
  })
})

test('observations: update ref', function (t) {
  var original = {
    lat: 1,
    lon: 2,
    type: 'observation',
    ref: 12094,
    timestamp: new Date().toISOString()
  }
  var update = {
    type: 'observation',
    ref: 12111
  }
  var expected = {
    type: 'observation',
    ref: 12111
  }
  testUpdateObservation(t, original, update, expected, function () {
    t.end()
  })
})

test('observations: update attachments', function (t) {
  var original = {
    lat: 1,
    lon: 2,
    type: 'observation',
    attachments: [{
      id: '12345.jpg',
      type: 'image/jpeg'
    }],
    timestamp: new Date().toISOString()
  }
  var update = {
    type: 'observation',
    attachments: [{
      id: '12345.jpg',
      type: 'image/jpeg'
    }, {
      id: '56789.jpg',
      type: 'image/jpeg'
    }]
  }
  var expected = {
    type: 'observation',
    attachments: [{
      id: '12345.jpg',
      type: 'image/jpeg'
    }, {
      id: '56789.jpg',
      type: 'image/jpeg'
    }]
  }
  testUpdateObservation(t, original, update, expected, function () {
    t.end()
  })
})

test('observations: update tags', function (t) {
  var original = {
    lat: 1,
    lon: 2,
    type: 'observation',
    tags: { hey: 'you' },
    timestamp: new Date().toISOString()
  }
  var update = {
    type: 'observation',
    tags: { foo: 'bar', hey: 'there' }
  }
  var expected = {
    type: 'observation',
    tags: { foo: 'bar', hey: 'there' }
  }
  testUpdateObservation(t, original, update, expected, function () {
    t.end()
  })
})

test('observations: update with invalid id fails gracefully', function (t) {
  createServer(function (server, base, osm, media) {
    putJson(`${base}/observations/null`, function (err, elm) {
      t.ok(err)
      server.close()
      t.end()
    })
  })
})

test('observations: try to update with bad version', function (t) {
  createServer(function (server, base, osm, media) {
    var obs = {
      type: 'observation',
      lat: 5,
      lon: 6
    }
    osm.create(obs, function (err, id, node) {
      t.error(err)

      var href = `${base}/observations/${id}`
      var hq = hyperquest.put(href, {
        headers: { 'content-type': 'application/json' }
      })

      var update = {
        type: 'observation',
        lat: 10,
        lon: 12,
        version: 'fake version',
        id: id
      }

      hq.on('response', function (res) {
        t.equal(res.statusCode, 400, 'bad request 400')
        server.close(function () { t.end() })
      })

      hq.end(JSON.stringify(update))
    })
  })
})

test('observations: try to update with bad id', function (t) {
  createServer(function (server, base, osm, media) {
    var obs = {
      type: 'observation',
      lat: 5,
      lon: 6
    }
    osm.create(obs, function (err, id, node) {
      t.error(err)

      var href = `${base}/observations/${id}`
      var hq = hyperquest.put(href, {
        headers: { 'content-type': 'application/json' }
      })

      var update = {
        type: 'observation',
        lat: 10,
        lon: 12,
        version: node.key,
        id: 'fake id'
      }

      hq.on('response', function (res) {
        t.equal(res.statusCode, 400, 'bad request 400')
        server.close(function () { t.end() })
      })

      hq.end(JSON.stringify(update))
    })
  })
})

test('observations: create + convert', function (t) {
  createServer(function (server, base, osm, media) {
    var og = {
      lat: 1,
      lon: 2,
      type: 'observation',
      timestamp: new Date().toISOString()
    }
    osm.create(og, function (err, id, node) {
      t.error(err)

      // convert to node
      putJson(`${base}/observations/to-element/${id}`, function (err, elm) {
        t.error(err)
        t.ok(elm.id)

        // look up observation again + check for element_id tag
        getJson(`${base}/observations/${id}`, function (err, obses) {
          t.error(err)
          t.equals(obses[0].tags.element_id, elm.id)

          // look up element + check id
          getJson(`${base}/observations/${elm.id}`, function (err, theElms) {
            t.error(err)
            t.equals(theElms[0].id, elm.id)

            // try to convert observation *again* and ensure the same id comes
            // back
            putJson(`${base}/observations/to-element/${id}`, function (err, oldElm) {
              t.error(err)
              t.equals(oldElm.id, elm.id)

              server.close()
              t.end()
            })
          })
        })
      })
    })
  })
})

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
    if (res.statusCode === 200) {
      hq.pipe(concat({ encoding: 'string' }, function (body) {
        cb(null, JSON.parse(body))
      }))
    } else {
      cb(res.statusCode)
    }
  })
  hq.end(data)
}

function putJson (href, cb) {
  var hq = hyperquest.put(href, { headers: { 'content-type': 'application/json' } })
  hq.on('response', function (res) {
    if (res.statusCode === 200) {
      hq.pipe(concat({ encoding: 'string' }, function (body) {
        cb(null, JSON.parse(body))
      }))
    } else {
      cb(res.statusCode)
    }
  })
  hq.end()
}

function getJson (href, cb) {
  var hq = hyperquest.get(href, { headers: { 'content-type': 'application/json' } })
  hq.on('response', function (res) {
    if (res.statusCode === 200) {
      hq.pipe(concat({ encoding: 'string' }, function (body) {
        cb(null, JSON.parse(body))
      }))
    } else {
      cb(res.statusCode)
    }
  })
}

function delJson (href, cb) {
  var hq = hyperquest.delete(href, { headers: { 'content-type': 'application/json' } })
  hq.on('response', function (res) {
    if (res.statusCode === 200) {
      hq.pipe(concat({ encoding: 'string' }, function (body) {
        cb(null, JSON.parse(body))
      }))
    } else {
      cb(res.statusCode)
    }
  })
  hq.end()
}

function testUpdateObservation (t, orig, update, expected, cb) {
  createServer(function (server, base, osm, media) {
    osm.create(orig, function (err, id, node) {
      t.error(err)

      var href = `${base}/observations/${id}`
      var hq = hyperquest.put(href, {
        headers: { 'content-type': 'application/json' }
      })

      update.version = node.key
      update.id = id

      hq.on('response', function (res) {
        t.equal(res.statusCode, 200, 'create 200 ok')
        t.equal(res.headers['content-type'], 'application/json', 'type correct')

        hq.pipe(concat({ encoding: 'string' }, function (body) {
          var obs = JSON.parse(body)

          var obsCopy = Object.assign({}, obs)
          delete obsCopy.id
          delete obsCopy.version
          delete obsCopy.timestamp
          t.deepEquals(obsCopy, expected)

          var href = `${base}/observations/${obs.id}`
          check(t, href, [obs], function () {
            server.close(cb)
          })
        }))
      })

      hq.end(JSON.stringify(update))
    })
  })
}
