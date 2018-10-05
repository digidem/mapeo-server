# Schema

**Current Version: 3**

This document describes the schema for documents in the osm-p2p database. The schema of p2p-osm is influenced by the schema OpenStreetMap (OSM) schema in [API v0.6](https://wiki.openstreetmap.org/wiki/API_v0.6) and the [OSM Overpass JSON output format](https://overpass-api.de/output_formats.html).

## Observations

| Property name | Client can modify? | Type | Description |
|---------------|--------------------|------|-------------|
| `timestamp`   |❌| `ISO Date string` | Datetime the observation was last updated |
| `created_at`  |❌| `ISO Date string` | Datetime the observation was created on the server |
| `type`        |❌| `ENUM=observation` | Used in the db to identify the type of document |
| `id`          |❌| `String` | Unique identifier of this document |
| `version`     |❌| `String` | Unique identifier of the document version |
| `schemaVersion` |✔️| `Number=3` | Identifies the schema of the document |
| `lon` |✔️| `Number` | The longitude of the observation |
| `lat` |✔️| `Number` | The latitude of the observation |
| `attachments` |✔️| `Array[{id: String}]` | An array of file attachments on the observation, with optional `type` defining their mimeType |
| `ref` |✔️| `String` | An id of a node/way/relation in the database that this observation refers to |
| `metadata` |✔️| `Object` | Optional client-supplied metadata relating to the observation, e.g. GPS accuracy; timestamp when the observation was created etc. |
| `fields` |✔️| `Array[{id: String, name: String, answered: Boolean, type: String, answer: String, type: string}]` | Optional field definitions used by the client to render questions. **NB:** In the future these will likely not be stored on the observation document and instead be matched to the current preset config like with Desktop / iD Editor |
| `tags` |✔️| Object | Optional fields about the observation e.g. description, question-answers about the observation etc. These fields are normally chosen by the user, as opposed to `metadata` fields which are defined by the client software |
