# Change Log

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [16.1.1](https://github.com/digidem/mapeo-server/compare/v16.1.0...v16.1.1) (2019-09-17)


### Bug Fixes

* Pass missing query screen to syncLeave ([8878f37](https://github.com/digidem/mapeo-server/commit/8878f37))



## [16.1.0](https://github.com/digidem/mapeo-server/compare/v16.0.1...v16.1.0) (2019-09-12)


### Features

* Allow a project_id to be specified for swarming ([#51](https://github.com/digidem/mapeo-server/issues/51)) ([d7eb75f](https://github.com/digidem/mapeo-server/commit/d7eb75f))

* Add /device/id route ([#50](https://github.com/digidem/mapeo-server/issues/50)) ([b582ef9](https://github.com/digidem/mapeo-server/commit/b582ef9))

# [15.0.0](https://github.com/digidem/mapeo-server/compare/v14.0.0...v15.0.0) (2019-05-04)


### Bug Fixes

* Correct cache-control and content-type headers ([bcf2bd3](https://github.com/digidem/mapeo-server/commit/bcf2bd3))


### Features

* **media:** Add preview images as well as thumbnail and original [BREAKING] ([#47](https://github.com/digidem/mapeo-server/issues/47)) ([0189c29](https://github.com/digidem/mapeo-server/commit/0189c29))


### BREAKING CHANGES

* **media:** Changes media route to POST instead of PUT, because PUT should be id-empotent, whereas this endpoint creates new resources for every POST.
* **media:** Pass parameters in the body of the request, rather than query string, to avoid url encoding issues
* **media:** Pass original as `original` property, rather than `file`
* **media:** All 3 image sizes are required
