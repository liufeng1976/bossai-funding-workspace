# Security Policy

## Supported security posture

BossAI Funding currently supports a local-owner, loopback-only deployment model. The local desktop and Web runtime are not a claim of production remote-authentication readiness.

Remote access remains blocked until approved external identity verification, authorization enforcement, tenant isolation and production security review requirements are satisfied.

## Reporting a vulnerability

Please do **not** open a public GitHub issue for a security vulnerability.

Before the repository is public, report security findings through BossAI's private internal security channel. After public release, use GitHub Private Vulnerability Reporting / Security Advisories for this repository when enabled.

Include, when possible:

- affected version / commit;
- affected operating system and runtime;
- reproduction steps;
- expected and actual behavior;
- impact assessment;
- proof-of-concept details that avoid unnecessary exposure of user data or secrets.

## Scope

Security-sensitive areas include:

- local-loopback binding and Host validation;
- browser same-origin / JSON mutation integrity;
- workspace revision and stale-write protection;
- tenant-scoped persistence and cross-tenant reference guards;
- authorization route classification;
- external identity verification boundary;
- local backup / restore integrity;
- desktop local-server startup, database path and single-instance behavior;
- installer/update/signing supply chain;
- dependency and secret exposure.

See `SECURITY_REVIEW_READINESS.md` for the current engineering evidence and remaining production blockers.

## Secrets

Never commit real API keys, passwords, SMTP credentials, signing certificates, access tokens, production identity-provider secrets or customer financing data.
