# Hacking on mapeo-mobile-server

Some notes for anyone working on or with mapeo-mobile-server.

## Tilesets

Raster and vector tiles are currently stored in the `tiles/` directory as
[asar](https://github.com/electron/asar) archives, with the structure

```
/
├── 12
│   ├── 1581
│   │   ├── 655.png
│   │   ├── 656.png
│   │   ├── 657.png
│   │   └── 658.png
├── 15
│   └── 5258
│       └── 12660.png
└── meta.json
```

The top-level directory is filled with Z coordinates, followed by Y coordinates,
and finally `X.ext` files at the leaves.

The special file `meta.json` is *required*. It must contain a minimum of

```
{
  "ext": "png",
  "mime": "image/png"
}
```

`ext` is to help the server figure out what extension to look for in the asar
archive, and `mime` is to help the server decide what MIME type to send in its
HTTP responses when serving the tiles.

If you have a directory with the Z dirs and a meta.json file assembled in a
directory called `dir`, you could create an asar archive for it by running

```
$ npm install --global asar

$ asar pack dir/ oakland.asar
```

By default, the server looks for tiles in the `tiles/` directory.
