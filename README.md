# Mapeo Mobile Server

Mapeo Mobile server, used for managing observation data. It includes observation
and media management routes and static file routes for an offline tile server.

## Install

```
$ npm install mapeo-mobile-server
```

## Routes

The following routes are available.

- **U**: unimplemented
- **F**: fixture available
- **R**: implemented & ready!

### Observations

#### [F] `GET /observations?bbox=a,b,c,d`

Get list of observations. Currently, `bbox` is ignored and all observations are
returned. The response is a JSON array of observation objects. E.g.

```json
[
  { "type": "observation", "lat": 12.1245, "lon": -0.3243 },
  ...
]
```

#### [F] `POST /observations`

Creates an observation. Expects a single JSON object representing the
observation. The following fields are required:

- `lat` (Number or String)
- `lon` (Number or String)
- `device_id` (String)

The object will be returned, with the fields `id` and `timestamp` set.

#### [F] `GET /observations/:id`

Fetch an observation by its `id`. A single JSON object will be returned.

#### [F] `PUT /observations/:id`

Update an observation by its `id` by providing a JSON object. Any fields given
will be replaced.

### Presets

#### [U] `GET /presets`

Returns a JSON array with the names of available presets. E.g.

```json
[
  "default_osm",
  "jungle",
  "waorani"
]
```

#### [F] `GET /presets/:id`

Fetch a preset with its `id`. Returns a single JSON object.

### Media

#### [U] `PUT /media`

Save a piece of media (photos only for now!) to the database. The raw media data
should be provided. The client should set the `Content-Type` header
appropriately (e.g. `image/jpg`) as a hint to the server, in case it has to do
any post-processing.

A single JSON object is returned, with, at minimum, the `id` field set, to
uniquely identify the uploaded media:

```json
{
  "id": "225961fb85d82312e8c0ed511"
  "type": "image/jpg"
}
```

#### [U] `GET /media/:id`

Retrieve a piece of media (photos only for now) by its `id`.

### Vector Tiles

#### [U] `GET /tiles`

Returns a JSON array with the names of all available vector tilesets. E.g.

```json
[
  "guyana_base",
  "guyana_overlay"
]
```

#### [U] `GET /tiles/:id/:x/:y/:z`

Fetch a single vector tile from the tileset `id` by an `x`,`y`,`z` coordinate.

### Sync

#### [U] `GET /sync/adb`

Perform a p2p sync with whatever device the phone is connected to via USB, using
Android's ADB protocol. Requires (I think) developer mode be enabled on the
device.

- HTTP 200 is returned on success
- HTTP 300 is returned if there was an android/adb/phone error
- HTTP 500 is returned if there was a server/database error

## Usage

```js
var hyperdb = require('hyperdb')
var hosm = require('hyperdb-osm')
var sub = require('subleveldown')
var grid = require('grid-point-store')
var level = require('level')
var Router = require('mapeo-mobile-server')

var db = level('./index')
var osm = hosm({
  db: hyperdb('./db', { valueEncoding: 'json' }),
  index: sub(db, 'idx'),
  pointstore: grid(sub(db, 'geo'))
})

var route = Router(osm)

var http = require('http')
var server = http.createServer(function (req, res) {
  var fn = route(req, res)
  if (fn) {
    fn()
  } else {
    res.statusCode = 404
    res.end('not found\n')
  }
})
server.listen(5000)
```

### Use as Express middleware

```js
app.use('/api', Router(dir))
```
