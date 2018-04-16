# Mapeo Mobile Server

Mapeo Mobile server, used for managing observation data. It includes observation and media management routes and static file routes for an offline tile server.

```
npm install mapeo-mobile-server
```

## Routes

`mapeo-mobile-server` currently implements the following routes:

- `GET /observations?bbox=a,b,c,d` Get list of observations.
- `POST /observations` Create an observation.
- `GET /observations/:id` Get an observation with given id.
- `GET /features` Get list of features.
- `GET /presets/:id` Get a preset with given id (e.g., "default")
- `GET /static/<path-to-static-file>` 

## Usage

```js
var mobileRouter = require('mapeo-mobile-server')

var router = mobileRouter('/path/to/directory')

var http = require('http')
var server = http.createServer(function (req, res) {
  if (router.handle(req, res)) {}
  else {
    res.statusCode = 404
    res.end('not found\n')
  }
})
server.listen(5000)
```

### Use as Express middleware

```js
app.use('/api', mobileRouter(dir))
```
