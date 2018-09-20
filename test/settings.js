var test = require('tape')
var {createServer} = require('./server')
var {check, putJson} = require('./utils')

test('settings: get', function (t) {
  createServer(function (server, base) {
    var expected = {
      staticRoot: '.'
    }
    var href = base + '/settings'
    check(t, href, expected, function () {
      server.close()
      t.end()
    })
  })
})

test('settings: put', function (t) {
  createServer(function (server, base) {
    var href = base + '/settings'
    var initialSettings = { staticRoot: '.' }
    var newSettings = { staticRoot: '/path/to/my/drive' }

    check(t, href, initialSettings, function () {
      putJson(href, newSettings, function (elm) {
        check(t, href, newSettings, function () {
          server.close()
          t.end()
        })
      })
    })
  })
})
