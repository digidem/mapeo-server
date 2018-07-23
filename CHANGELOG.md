# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Changed

- Changed prop from `created_at_timestamp` to `timestamp`
- Changed timestamp format from milliseconds since unix epoc to a UTC string (match the timestamp format of osm types)
- More strict checking of observation properties on create and update


[Unreleased]: https://github.com/digidem/mapeo-server/compare/v7.0.3...HEAD
