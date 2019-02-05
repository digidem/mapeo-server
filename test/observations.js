var test = require('tape')
var hyperquest = require('hyperquest')
var {createServer} = require('./server')
var concat = require('concat-stream')
var isodate = require('@segment/isodate')

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
        t.equal(typeof obj.id, 'string', 'id field is string')
        t.equal(typeof obj.version, 'string', 'version field is string')
        t.ok(isodate.is(obj.timestamp), 'timestamp field set')
        t.ok(isodate.is(obj.created_at), 'created_at field set')
        t.equal(obj.schemaVersion, 3, 'could set schema version')
        t.deepEqual(obj.metadata, {foo: 'bar'}, 'metadata passed through')
      } catch (e) {
        t.error(e, 'json parsing exception!')
      }
      server.close()
      t.end()
    }))

    hq.end(JSON.stringify({
      lat: 5,
      lon: -0.123,
      type: 'observation',
      metadata: {
        foo: 'bar'
      },
      schemaVersion: 3
    }))
  })
})

test('observations: create - ignores created_at passed by client', function (t) {
  createServer(function (server, base) {
    var href = base + '/observations'
    var createdAt = (new Date(2018, 0, 1)).toISOString()

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
        t.equal(typeof obj.id, 'string', 'id field is string')
        t.equal(typeof obj.version, 'string', 'version field is string')
        t.ok(isodate.is(obj.timestamp), 'timestamp field set')
        t.notEqual(obj.created_at, createdAt, 'created_at field ignored from client')
      } catch (e) {
        t.error(e, 'json parsing exception!')
      }
      server.close()
      t.end()
    }))

    hq.end(JSON.stringify({
      lat: 5,
      lon: -0.123,
      type: 'observation',
      created_at: createdAt
    }))
  })
})

test('observations: create + delete', function (t) {
  createServer(function (server, base) {
    var data = JSON.stringify({lat: 5, lon: -0.123, type: 'observation'})

    postJson(base + '/observations', data, function (obs) {
      t.error(obs.error)
      t.ok(obs.id, 'id field set')
      t.ok(obs.version, 'version field set')
      t.ok(obs.timestamp, 'timestamp field set')

      delJson(`${base}/observations/${obs.id}`, function (resp) {
        t.error(resp.error)

        getJson(`${base}/observations/${obs.id}`, function (obses) {
          t.error(obses.err)
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
    var data = {lat: 1, lon: 2, type: 'observation'}
    postJson(base + '/observations', data, function (obs) {
      t.error(obs.error)

      var expected = {
        lat: 1,
        lon: 2,
        id: obs.id,
        type: 'observation',
        version: obs.version
      }

      var href = base + '/observations/' + obs.id

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
          t.same(objs[0].version, expected.version)
          t.same(objs[0].id, expected.id)
          t.ok(objs[0].schemaVersion)
          t.ok(objs[0].timestamp)
          t.ok(objs[0].created_at)
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
    var _obs1 = {lat: 2, lon: 2, type: 'observation'}
    postJson(base + '/observations', _obs1, function (obs1) {
      t.error(obs1.error)

      var _obs2 = {lat: 2, lon: 3, type: 'observation'}
      postJson(base + '/observations', _obs2, function (obs2) {
        t.error(obs2.error)
        var expected = [ obs1, obs2 ]
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
    device_id: '123',
    type: 'observation',
    timestamp: new Date().toISOString()
  }
  var update = {
    lat: 1.5,
    lon: 2,
    device_id: '127',
    type: 'observation'
  }
  var expected = {
    lat: 1.5,
    lon: 2,
    device_id: '123',
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
    lat: 1,
    lon: 2,
    type: 'observation',
    ref: 12111
  }
  testUpdateObservation(t, original, update, expected, function () {
    t.end()
  })
})

test('observations: update metadata', function (t) {
  var original = {
    lat: 1,
    lon: 2,
    type: 'observation',
    metadata: {foo: 'bar', qux: 'nux'},
    timestamp: new Date().toISOString()
  }
  var update = {
    type: 'observation',
    metadata: {foo: 'noo'}
  }
  var expected = {
    lat: 1,
    lon: 2,
    type: 'observation',
    metadata: {foo: 'noo'}
  }
  testUpdateObservation(t, original, update, expected, function () {
    t.end()
  })
})

test('observations: update to created_at ignored', function (t) {
  var original = {
    lat: 1,
    lon: 2,
    type: 'observation',
    metadata: {foo: 'bar', qux: 'nux'},
    timestamp: new Date().toISOString(),
    created_at: (new Date(2018, 0, 1)).toISOString()
  }
  var update = {
    type: 'observation',
    metadata: {foo: 'noo'},
    created_at: (new Date(2001, 0, 1)).toISOString()
  }
  var expected = {
    lat: 1,
    lon: 2,
    type: 'observation',
    metadata: {foo: 'noo'},
    created_at: (new Date(2018, 0, 1)).toISOString()
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
    lat: 1,
    lon: 2,
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
    lat: 1,
    lon: 2,
    type: 'observation',
    tags: { foo: 'bar', hey: 'there' }
  }
  testUpdateObservation(t, original, update, expected, function () {
    t.end()
  })
})

test('observations: update with invalid id fails gracefully', function (t) {
  createServer(function (server, base, osm, media) {
    putJson(`${base}/observations/null`, function (elm) {
      t.ok(elm.error)
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

      hq.pipe(concat({ encoding: 'string' }, function (body) {
        var objs = JSON.parse(body)
        t.same(objs.status, 400)
      }))

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

test('observations: convert schema 1 observations', function (t) {
  var oldObs = {
    device_id: '1',
    type: 'observation',
    lat: 53.42769424,
    lon: -2.24193244,
    link: 'link',
    created: '2018-10-03T14:28:17.529Z',
    name: 'Gathering Site',
    notes: 'Did this good to',
    observedBy: 'Tú',
    attachments: ['c1816f964dfc19bf8f20a50ba873588e.jpg'],
    icon: null,
    categoryId: 'gathering-site',
    fields: [
      {
        name: 'source',
        id: 'source',
        type: 'text',
        placeholder: 'Source of the data',
        answered: true,
        answer: 'He had food do if'
      },
      {
        name: 'animal-type',
        id: 'items-gathered',
        type: 'text',
        placeholder: 'What is collected here',
        answered: true,
        answer: 'Just called say did go'
      }
    ],
    created_at_timestamp: 1538576998821,
    version: '753c4c768c109bf4e1ab5b957d61bf78f2c52ab429c6226b3f54682d38fd8f9e'
  }
  var expected = {
    tags: {
      name: 'Gathering Site',
      notes: 'Did this good to',
      icon: null,
      categoryId: 'gathering-site',
      source: 'He had food do if',
      'items-gathered': 'Just called say did go'
    },
    fields: [
      {
        name: 'source',
        id: 'source',
        type: 'text',
        placeholder: 'Source of the data',
        answered: true,
        answer: 'He had food do if'
      },
      {
        name: 'animal-type',
        id: 'items-gathered',
        type: 'text',
        placeholder: 'What is collected here',
        answered: true,
        answer: 'Just called say did go'
      }
    ],
    type: 'observation',
    lat: 53.42769424,
    lon: -2.24193244,
    created_at: '2018-10-03T14:28:17.529Z',
    attachments: [ {id: 'c1816f964dfc19bf8f20a50ba873588e.jpg'} ]
  }
  createServer(function (server, base, osm, media) {
    osm.create(oldObs, function (err, id, node) {
      t.error(err)
      getJson(`${base}/observations/${id}`, function (theElms) {
        delete theElms[0].version
        delete theElms[0].id
        t.deepEqual(theElms[0], expected, 'observation converted correctly')
        server.close()
        t.end()
      })
    })
  })
})

test('observations: convert schema 2 observations', function (t) {
  var oldObs = {
    lon: 0,
    lat: 0,
    attachments: [{ id: '77bc7ebd7c8583e6d6cd376e6b2a7dc8.jpg' }],
    tags: {
      created: '2018-10-05T10:44:16.554Z',
      name: 'Building',
      notes: 'When all the',
      categoryId: 'building',
      fields: [
        {
          name: 'source',
          id: 'source',
          type: 'text',
          placeholder: 'Source of the data',
          answered: true,
          answer: 'Can h him v can'
        },
        {
          name: 'building-type',
          id: 'building-type',
          type: 'text',
          placeholder: 'School/hospital/etc',
          answered: false,
          answer: ''
        }
      ]
    },
    type: 'observation',
    timestamp: '2018-10-05T10:44:57.420Z'
  }

  var expected = {
    lon: 0,
    lat: 0,
    attachments: [{ id: '77bc7ebd7c8583e6d6cd376e6b2a7dc8.jpg' }],
    created_at: '2018-10-05T10:44:16.554Z',
    tags: {
      name: 'Building',
      notes: 'When all the',
      categoryId: 'building'
    },
    fields: [
      {
        name: 'source',
        id: 'source',
        type: 'text',
        placeholder: 'Source of the data',
        answered: true,
        answer: 'Can h him v can'
      },
      {
        name: 'building-type',
        id: 'building-type',
        type: 'text',
        placeholder: 'School/hospital/etc',
        answered: false,
        answer: ''
      }
    ],
    type: 'observation',
    timestamp: '2018-10-05T10:44:57.420Z'
  }

  createServer(function (server, base, osm, media) {
    osm.create(oldObs, function (err, id, node) {
      t.error(err)
      getJson(`${base}/observations/${id}`, function (theElms) {
        delete theElms[0].version
        delete theElms[0].id
        t.deepEqual(theElms[0], expected, 'observation converted correctly')
        server.close()
        t.end()
      })
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
      putJson(`${base}/observations/to-element/${id}`, function (elm) {
        t.error(elm.error)
        t.ok(elm.id)

        // look up observation again + check for element_id tag
        getJson(`${base}/observations/${id}`, function (obses) {
          t.error(obses.error)
          t.equals(obses[0].tags.element_id, elm.id)

          // look up element + check id
          getJson(`${base}/observations/${elm.id}`, function (theElms) {
            t.error(theElms.error)
            t.equals(theElms[0].id, elm.id)

            // try to convert observation *again* and ensure the same id comes
            // back
            putJson(`${base}/observations/to-element/${id}`, function (oldElm) {
              t.error(oldElm.error)
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
      var sorter = (a, b) => Number(a.id) < Number(b.id)
      t.deepEquals(objs.sort(sorter), expected.sort(sorter), 'observation from server matches expected')
    } catch (e) {
      t.error(e, 'json parsing exception!')
    }
    done()
  }))
}

function postJson (href, data, cb) {
  if (typeof data !== 'string') data = JSON.stringify(data)
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
