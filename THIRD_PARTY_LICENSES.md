# Third-Party Licenses

BossAI Funding is intended to remain compatible with closed-source commercial distribution, SaaS, private deployment, OEM licensing, enterprise licensing, and commercial subscriptions.

Strong-copyleft dependencies such as AGPL, GPL, and SSPL must not be introduced without explicit CEO approval and a legal/license review.

## Phase 0 / Phase 1 dependencies

| Package / Runtime | Use | License | Distribution role |
|---|---|---|---|
| Node.js 24+ | Runtime, HTTP server, test runner, native SQLite API | MIT and bundled third-party notices | Runtime prerequisite / packaged runtime decision deferred |
| TypeScript 5.9.3 | Type checking and compilation | Apache-2.0 | Development dependency |
| `@types/node` 24.13.3 | Node.js TypeScript declarations | MIT | Development dependency |
| `undici-types` 7.18.2 | Transitive fetch/Undici type declarations used by `@types/node` | MIT | Transitive development dependency |

## Application runtime packages

No npm application runtime package is required by the Phase 1 implementation. The server uses Node built-in modules and `node:sqlite`.

## Maintenance rule

Whenever a dependency is added or upgraded, record its package name, version range, purpose, license, and commercial-distribution impact here before release acceptance.
