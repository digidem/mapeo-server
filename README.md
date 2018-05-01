# Mapeo Mobile Server

Mapeo Mobile server, used for managing observation data. It includes observation
and media management routes and static file routes for an offline tile server.

## Install

```
$ npm install mapeo-mobile-server
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

#### [F] `GET /observations/:id`

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
  "id": "225961fb85d82312e8c0ed511"
  "type": "image/jpg"
}
```

#### `GET /media/:id`

Retrieve a piece of media (photos only for now) by its `id`.

### Mapbox Styles & Tiles

#### `GET /styles`

Returns a JSON array with the names of all available vector tilesets. E.g.

```json
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

#### [TODO] `GET /sync/wifi`

some kind of sync thing. it's going to be great.

- HTTP 200 is returned on success
- HTTP 300 is returned if there was an android/adb/phone error
- HTTP 500 is returned if there was a server/database error

## Usage

```js
var Osm = require('osm-p2p')
var blobstore = require('fs-blob-store')
var Router = require('mapeo-mobile-server')

var osm = Osm('./db')
var media = blobstore('./media')

var route = Router(osm, media)

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
