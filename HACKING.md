# Hacking on mapeo-server

Some notes for anyone working on or with mapeo-server.

## Vector & Raster Tiles

The server is designed to work with Mapbox. All tilesets are in the `tiles/`
directory. Each directory looks like the following:

```
tiles/streets-sat-style/
├── fonts
│   ├── DIN Offc Pro Bold,Arial Unicode MS Bold
│   │   └── 0-255.pbf
│   ├── DIN Offc Pro Bold,Arial Unicode MS Regular
│   │   └── 0-255.pbf
│   ├── DIN Offc Pro Italic,Arial Unicode MS Regular
│   │   └── 0-255.pbf
│   ├── DIN Offc Pro Medium,Arial Unicode MS Regular
│   │   └── 0-255.pbf
│   ├── DIN Offc Pro Medium Italic,Arial Unicode MS Regular
│   │   └── 0-255.pbf
│   └── DIN Offc Pro Regular,Arial Unicode MS Regular
│       └── 0-255.pbf
├── sprites
│   ├── sprite@2x.json
│   ├── sprite@2x.png
│   ├── sprite.json
│   └── sprite.png
├── style.json
└── tiles
    ├── mapbox.mapbox-streets-v7.asar
    └── mapbox.satellite.asar
```

This is the standard mapbox layout, with the exception of the tiles themselves,
which are stored as [asar](https://github.com/electron/asar) archives. Each has
the structure

```
mapbox.mapbox-streets-v7.asar
├── 10
│   └── 164
│       └── 395.vector.pbf
├── 11
│   ├── 328
│   │   └── 791.vector.pbf
│   └── 329
│       └── 791.vector.pbf
├── 12
│   ├── 656
│   │   ├── 1582.vector.pbf
│   │   └── 1583.vector.pbf
│   ├── 657
│   │   ├── 1582.vector.pbf
│   │   └── 1583.vector.pbf
│   └── 658
│       ├── 1582.vector.pbf
│       └── 1583.vector.pbf
├── 6
│   └── 10
│       └── 24.vector.pbf
├── 7
│   └── 20
│       └── 49.vector.pbf
├── 8
│   └── 41
│       └── 98.vector.pbf
├── 9
│   └── 82
│       └── 197.vector.pbf
```

The top-level directory is filled with Z coordinates, followed by Y coordinates,
and finally `X.ext` files at the leaves.

If you have a directory with the Z dirs and a meta.json file assembled in a
directory called `dir`, you could create an asar archive for it by running

```
$ npm install --global asar

$ cd tiles/TILESET/tiles/FOO

$ asar pack FOO/ FOO.asar
```

By default, the server looks for `style.json` files in the subdirectories of the
`tiles/` directory.
