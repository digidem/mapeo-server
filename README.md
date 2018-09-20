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

#### `PUT /media?file=PATH&thumbnail=PATH

Save a piece of media (photos only), identified by the absolute file path `PATH`
to the database. `PATH` should be URL encoded.

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

#### `GET /sync/announce`

Announce (or reannounce) the current server as a valid sync target.

Returns 200 OK once broadcasting has begun.

#### `GET /sync/unannounce`

Stop announcing (advertising) the current server as a sync target.

Returns 200 OK once broadcasting has terminated.

#### `GET /sync/targets`

Returns list of available sync targets. Right now, only lists other services broadcasting on the local network through mdns using the 'mapeo-sync' key.

Each sync target is an object with `ip`, `port`, and `host`.

#### `GET /sync/start`

Options

  * `port` and `host`: To sync with another target through TCP (UDP?)
  * `dataset`: dataset id, string (filepaths managed internally)
  * `filename`: For local filesystem sync (manage export yourself, pass the absolute filename) 

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

### Datasets

A dataset is an instance of map data that includes monitoring, mapping, and
media data in one bundle that can be synced between Mapeo Core instances.
Currently, datasets are not designed to be merged so it is important that any
data that you want to view together in the same map is contained in a single
dataset. 

A dataset has a few basic user data fields that can be accessed and updated for easily
identifying datasets in a user interface:

|field|type|required|description|
|---|---|---|---| 
|id|string|required|A unique identifier.|
|name|string|required|A human-readable name.|
|description|string|optional|A human-readable description.|
|preset|string|optional|The [preset](#presets) id.|
|timestamp|integer|optional|The UNIX timestamp when the file was last synced.|

The client must pass in a `root` which is the filepath for the datasets. When
the client syncs with a given dataset, mapeo will look in this root
directory and scan all files, read the user data for each sync file, and see if
a file with a matching dataset id already exists. If there is a matching
dataset id, then it will sync to that file. If the file does not exist, it will
create a new syncfile at that location. 

The benefit of using datasets is the client does not have to manage their own
filepaths for data sync to USB - mapeo-core does that for them. Users can also
update the name of files as long as they keep the same file extension that is
originally generated. 

#### `GET /datasets/:id`

Get the information related to a dataset.

#### `PUT /datasets/:id`

Update a field for the given dataset. For example:

```
$ curl -X PUT -H "Content-Type: application/json" -d '{"name": "Waorani Dataset"}' http://localhost:5000/datasets/waorani 
```

Returns the dataset as JSON with (optionally) new timestamp.

#### `POST /datasets/:id`

Create a new dataset with the given id. Returns the dataset as JSON. If no `name` passed through the JSON body, then the `id` will be used as the name.

#### `DELETE /datasets/:id`

Delete a dataset with the given id. 

### Settings

Settings that can be modified on the fly by the client. 

```json
{
  "datasets": {
    "root": "/path/to/my/usb/stick"
  },
  "media": {
    "mode": "sync"
  },
}

```


#### `GET /settings/`

Get the settings for the current mapeo-server instance.

#### `PUT /settings/`

Update a settings field from the client.

## Usage

```js
var Osm = require('osm-p2p')
var blobstore = require('fs-blob-store')
var Router = require('mapeo-server')

var osm = Osm('./db')
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
