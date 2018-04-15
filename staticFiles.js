const ecstatic = require('ecstatic')
const http = require('http')
const url = require('url')
const getport = require('getport')
const fs = require('fs')

module.exports = function (req, res, params, splats) {
  var u = url.parse(req.url)
  if (u.pathname.startsWith('/tiles')) {
    res.setHeader('content-encoding', 'gzip')
  }
  if (u.pathname === '/style.json') {
    return serveStyleFile(styleFile, req, res)
  }
  ecstatic({ root: root, cors: true })(req, res)
})


function serveStyleFile (styleFile, req, res) {
  fs.stat(styleFile, function (err, stat) {
    if (err) console.error(err)
    fs.readFile(styleFile, 'utf8', function (err, data) {
      if (err) console.error(err)
      data = Buffer.from(data.replace(/\{host\}/gm, 'http://' + req.headers.host))
      res.setHeader('content-type', 'application/json; charset=utf-8')
      res.setHeader('last-modified', (new Date(stat.mtime)).toUTCString())
      res.setHeader('content-length', data.length)
      res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type, If-Match, If-Modified-Since, If-None-Match, If-Unmodified-Since')
      res.setHeader('Access-Control-Allow-Origin', '*')
      res.statusCode = 200
      res.write(data)
      res.end()
    })
  })
}
