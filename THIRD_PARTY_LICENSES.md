# Third-Party Licenses

BossAI Funding itself is dual-licensed under AGPL-3.0-or-later and separate commercial terms. Third-party dependencies must remain compatible with both the open-source distribution path and BossAI's separately licensed proprietary commercial distribution path.

New strong-copyleft third-party dependencies such as AGPL, GPL, or SSPL must not be introduced without explicit CEO approval and a legal/license review. This rule governs third-party dependencies; it does not conflict with BossAI Funding's own approved AGPL license.

## Phase 0 / Phase 1 dependencies

| Package / Runtime | Use | License | Distribution role |
|---|---|---|---|
| Node.js 24+ | Runtime, HTTP server, test runner, native SQLite API | MIT and bundled third-party notices | Source-development runtime |
| Electron 43.4.1 | Windows desktop shell and packaged Node/Chromium runtime | MIT plus bundled Chromium/Node third-party notices | Distributed desktop runtime |
| electron-builder 26.15.3 | Windows packaging / NSIS orchestration | MIT | Build-time tool; not an application authority |
| TypeScript 5.9.3 | Type checking and compilation | Apache-2.0 | Development dependency |
| `@types/node` 24.13.3 | Node.js TypeScript declarations | MIT | Development dependency |
| `undici-types` 7.18.2 | Transitive fetch/Undici type declarations used by `@types/node` | MIT | Transitive development dependency |

## Application runtime packages

The Funding server itself has no npm application runtime package dependency and uses Node built-in modules plus `node:sqlite`. The official desktop distribution embeds that same server in Electron; Electron is a distribution shell, not a second Funding business implementation.

## External data services

External funding data is not treated as a software dependency. Source terms, permitted use, attribution, provenance fields, and admission rules are maintained separately in `DATA_SOURCES.md`.

The current Grants.gov integration adds no npm package and uses the built-in `fetch` API. Its data/API terms must be reviewed as source terms rather than represented as a software license.

## Maintenance rule

Whenever a dependency is added or upgraded, record its package name, version range, purpose, license, and commercial-distribution impact here before release acceptance.
