# Mapeo Server

Mapeo server, used for managing observation data. It includes observation and
media management routes and static file routes for an offline tile server.

## Install

```
$ npm install mapeo-server
```

## Routes

The following routes are available.

### Observations

#### `GET /observations?bbox=a,b,c,d`

Get list of observations. Currently, `bbox` is ignored and all observations are
returned. The response is a JSON array of observation objects. E.g.

```json
[
  { "type": "observation", "lat": 12.1245, "lon": -0.3243 },
  ...
]
```

#### `POST /observations`

Creates an observation. Expects a single JSON object representing the
observation. The following fields are required:

- `lat` (Number or String)
- `lon` (Number or String)
- `device_id` (String)

The object will be returned, with the fields `id` and `timestamp` set.

#### `GET /observations/:id`

Fetch an observation by its `id`. An array of JSON objects will be returned.
Usually there will only be one result, but in forking situations (e.g. two
devices create offline edits of the same observation then sync) there can be
multiple results.

#### `PUT /observations/:id`

Update an observation by its `id` by providing a JSON object. Any fields given
will be replaced.

### Presets

#### `GET /presets`

Returns a JSON array with the names of available presets. E.g.

```json
[
  "default_osm",
  "jungle",
  "waorani"
]
```

#### `GET /presets/:id/*`

Fetch a static file belonging to a preset with id `id`.

### Media

#### `PUT /media`

Save a piece of media (photos only for now!) to the database. The raw media data
should be provided. The client should set the `Content-Type` header
appropriately (e.g. `image/jpg`) as a hint to the server, in case it has to do
any post-processing.

A single JSON object is returned, with, at minimum, the `id` field set, to
uniquely identify the uploaded media:

```json
{
  "id": "225961fb85d82312e8c0ed511",
  "type": "image/jpg"
}
```

#### `GET /media/:id`

Retrieve a piece of media (photos only for now) by its `id`.

### Mapbox Styles & Tiles

#### `GET /styles`

Returns a JSON array with the names of all available vector tilesets. E.g.

```js
[
  {
    id: 'satellite-v9',
    name: 'Satellite',
    bounds: [ -122.339973, 37.742214, -122.150116, 37.856694 ],
    minzoom: 0, maxzoom: 22
  }
]
```

#### `GET /styles/:id/style.json`

Retrieve the `style.json` file for a given style.

#### `GET /styles/:id/tiles/:x/:y/:z.:ext`

Fetch a single vector tile from the tileset `id` by an `x`,`y`,`z` coordinate.

### Sync

#### `GET /sync/targets`

Returns list of available sync targets. Right now, only lists other services broadcasting on the local network through mdns using the 'mapeo-sync' key.

Each sync target is an object with `ip`, `port`, and `host`.

#### `GET /sync/start`

Options

  * `filename`: For local filesystem sync, provide filename
  * `port` and `host`: To sync with another target through TCP (UDP?)

Start syncing and listen to progress events. Events are returned as a newline-delimited JSON stream.

Events are returned with a `topic` and `message` key:

```js
{"topic": "replication-error", "message": "Some error message here"}
```

Valid event topics:

  * `replication-error`: Sent once there is error, and the stream is closed.
  * `replication-started`: Sent once to indicate replication has started, but no data has been sent.
  * `replication-progress`: Sent for each block of data sent.
  * `replication-complete`: Sent once for a replication success, and the stream is closed.

Example client code for `/sync/start`
```js
var hyperquest = require('hyperquest')
var target = {filename: '/path/to/my/database.mapeodata'}
var url = `http://${host}/sync/start?${querystring.stringify(target)}`
var hq = hyperquest(url)
var stream = pump(hq, split2())
stream.on('data', function (data) {
  var row = JSON.parse(data)
  if (row.topic === 'replication-progress') console.log('progress...')
  if (row.topic === 'replication-error') console.log('error', row.message)
  if (row.topic === 'replication-complete') console.log('done')
})

```

## Usage

```js
var Osm = require('osm-p2p')
var blobstore = require('fs-blob-store')
var Router = require('mapeo-server')

var osm = Osm('./db')
var media = blobstore('./media')

var route = Router(osm, media)

var http = require('http')
var server = http.createServer(function (req, res) {
  var fn = route.handle(req, res)
  if (fn) {
    fn()
  } else {
    res.statusCode = 404
    res.end('not found\n')
  }
})
server.listen(5000)
server.on('close', function () {
  route.api.close()
})
```

### Use as Express middleware

```js
app.use('/api', Router(dir))
```
