# Mapeo Server

Mapeo server, used for managing observation data. It includes observation and
media management routes and static file routes for an offline tile server.

## Install

```
$ npm install mapeo-server
```

## API

> var MapeoServer = require('mapeo-server')

### var server = MapeoServer(osm, media[, opts])

Creates a mapeo http server.

`osm` is a [kappa-osm][kappa-osm] instance.

`media` is an instance of [abstract-blob-store][abstract-blob-store]. In order to do sync correctly, it must be patched with a `list(cb)` method, or you can use a blob store that already supports this, like [safe-fs-blob-store][safe-fs-blob-store].

Valid `opts` include
- `staticRoot` (string): the filesystem path to serve static files, like styles and tiles from.

### var handled = server.handle(req, res)

Tries to handle an http request `req`, writing the result to `res`. Returns true if it was handled, and false if not.

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

The property `ref` can also be optionally set, to indicate that the observation *observes* the OSM element with ID `ref`.

#### `GET /observations/:id`

Fetch an observation by its `id`. An array of JSON objects will be returned.
Usually there will only be one result, but in forking situations (e.g. two
devices create offline edits of the same observation then sync) there can be
multiple results.

#### `PUT /observations/:id`

Update an observation by its `id` by providing a JSON object representing the new observation. `id` and `version` *must* be set. Only the following fields can be modified:

- `lat`
- `lon`
- `ref`
- `attachments`
- `tags`

#### `PUT /observations/to-element/:id`

Converts an observation, by its ID, to an OSM element (defaults to `node`
currently). Returns an object of the form `{ id: elementId }`. If the
observation has already been converted to a node, it will return the existing
ID.

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

#### `PUT /media?file=PATH&thumbnail=PATH`

Save a piece of media (photos only) to the database, identified by the absolute
file path `PATH` on the same machine as the server. `PATH` must be URL
encoded.

Optionally, a thumbnail file path may also be included.

A single JSON object is returned, with the media's unique `id`:

```json
{
  "id": "225961fb85d82312e8c0ed511.jpg",
}
```

To fetch the thumbnail later, one would hit the route `GET /media/thumbnail/225961fb85d82312e8c0ed511.jpg`.

#### `GET /media/:type/:id`

Retrieve a piece of media (photos only for now) by its `id`. Valid `type`s are `original` and `thumbnail`. e.g.

```
GET /media/thumbnail/225961fb85d82312e8c0ed511.jpg
```
or
```
GET /media/original/225961fb85d82312e8c0ed511.jpg
```

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

#### `GET /sync/listen`

Begin the sync server for listening for connections.  Returns 200 OK once server is up and running.

#### `GET /sync/join`

Join the network and become discoverable by other peers.

Optionally, a name for this peer can be provided, to appear in others
`/sync/targets` list.

#### `GET /sync/leave`

Leave the network and no longer be discoverable.

#### `GET /sync/destroy`

Destroy the current sync server and close all open connections. Returns 200 OK once connections have terminated.

#### `GET /sync/peers`


Options

  * `interval`: Default false. If set, will send an updated list of the peers at the
    given interval using streaming GET request.

Returns list of available sync peers every set interval. Only lists other devices broadcasting using the 'mapeo-sync' key.

Each sync target is an object with `ip`, `port`, `host`, and `name` if device
name is set.

```js
GET /sync/peers?interval=300

// then every 300ms...
{ topic: 'peers', message: [{ip: '127.0.0.1', port: 1337, host: 'hostname', name: "Karissa's Device"}]}
{ topic: 'peers', message: [{ip: 127.0.0.1, port: 1337, host: 'hostname', name: "Karissa's Device"}]}

```

#### `GET /sync/start`

Options

  * `filename`: For local filesystem sync, provide filename
  * `port` and `host`: To sync with another target through TCP (UDP?)

Start syncing and listen to progress events. Events are returned as a newline-delimited JSON stream.

Events are returned with a `topic` and `message` key:

```js
{"topic": "replication-started" }
{"topic": "replication-progress", {"db": { "sofar": 5, "total": 10 }, "media": { "sofar": 12, "total": 95 } } }
{"topic": "replication-error", "message": "Some error message here"}
{"topic": "replication-complete" }

Valid event topics:

  * `replication-error`: Sent once there is error, and the stream is closed.
  * `replication-started`: Sent once to indicate replication has started, but no data has been sent.
  * `replication-progress`: Sent for each datum (map element, photo) sent.
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
  if (row.topic === 'replication-progress') console.log('progress...', row.message)
  if (row.topic === 'replication-error') console.log('error', row.message)
  if (row.topic === 'replication-complete') console.log('done')
})

```

## Usage

```js
var osmdb = require('kappa-osm')
var kappa = require('kappa-core')
var raf = require('random-access-file')
var level = require('level')
var blobstore = require('safe-fs-blob-store')
var Router = require('mapeo-server')

var osm = osmdb({
  core: kappa('./db', {valueEncoding: 'json'}),
  index: level('./index')),
  storage: function (name, cb) {
    process.nextTick(cb, null, raf(path.join(dir, 'storage', name)))
  }
})
var media = blobstore('./media')

var root = '/path/to/my/static/files' // optional
var route = Router(osm, media, {staticRoot: root})

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

## Caveats

Relies on `fs` for media copying right now: this is a bug.

[kappa-osm]: https://github.com/digidem/kappa-osm
[abstact-blob-store]: https://github.com/maxogden/abstract-blob-store
[safe-fs-blob-store]: https://github.com/noffle/safe-fs-blob-store

