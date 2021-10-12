# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

### [17.1.1](https://github.com/digidem/mapeo-server/compare/v17.1.0...v17.1.1) (2021-10-12)


### Bug Fixes

* Upgrade mapeo core for sync file fix ([190a621](https://github.com/digidem/mapeo-server/commit/190a621ea13723ac02e386ec829a7587953ca146))

## [17.1.0](https://github.com/digidem/mapeo-server/compare/v17.0.7...v17.1.0) (2021-02-05)


### Features

* Add websocket sync via mapeo-core@8.5.0 ([#61](https://github.com/digidem/mapeo-server/issues/61)) ([2441799](https://github.com/digidem/mapeo-server/commit/244179975d1769b6d59f5d5be1730128d489d31b))

### [17.0.7](https://github.com/digidem/mapeo-server/compare/v17.0.6...v17.0.7) (2020-12-21)

### [17.0.1](https://github.com/digidem/mapeo-server/compare/v17.0.0...v17.0.1) (2019-11-25)

## [17.0.0](https://github.com/digidem/mapeo-server/compare/v16.1.1...v17.0.0) (2019-11-14)


### ⚠ BREAKING CHANGES

* Use 32-byte project_key as url param, instead of project_id
* Fix sync issues with update to mapeo-core 8 and kappa-core 4

### Features

* Use 32-byte project_key as url param, instead of project_id ([fff3226](https://github.com/digidem/mapeo-server/commit/fff322623f33aa1507acd546b73a27b2cb67bec7))


### Bug Fixes

* Fix sync issues with update to mapeo-core 8 and kappa-core 4 ([d2aa43e](https://github.com/digidem/mapeo-server/commit/d2aa43ecab9f0dcf4e8016aebcecb60206e93744))
* Fix tests which expected device_id ([2328e6d](https://github.com/digidem/mapeo-server/commit/2328e6d271013d1bcd02fe3f997fd9c19a218f2e))

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
