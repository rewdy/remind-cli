# 1.0.0 (2026-07-22)


### Bug Fixes

* replace better-sqlite3 with node:sqlite/bun:sqlite to survive Node version switches ([206b555](https://github.com/rewdy/remind-cli/commit/206b555774618277f0538e9b738742c284f30f80))


### Features

* add confirmation prompt to remind init before editing shell config ([35b5eb4](https://github.com/rewdy/remind-cli/commit/35b5eb4300b3419566bf446817a13ce6b55d8619))
* add database layer and date utilities ([212f168](https://github.com/rewdy/remind-cli/commit/212f1680d1169000c8579b8c1481a3e0a1681a3e))
* implement full remind-cli MVP ([421ef15](https://github.com/rewdy/remind-cli/commit/421ef15f67dbc7139273394c4fc826d2e7d3ae88))
* replace bun:sqlite/Bun.file with better-sqlite3/node:fs and bundle with esbuild for cross-platform Node.js distribution ([17ffe29](https://github.com/rewdy/remind-cli/commit/17ffe29025d4d2020b7e2c426c0feba8eab13347))
* use interactive date picker when adding one-time reminders ([32d3d0d](https://github.com/rewdy/remind-cli/commit/32d3d0d8e244356114670c36ce4db6c3d974e0d8))
