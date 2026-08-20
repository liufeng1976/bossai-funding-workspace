# BossAI Funding Desktop Icon

The Windows desktop icon is generated deterministically by `scripts/prepare-desktop-assets.mjs`; no third-party binary artwork is required.

## Visual contract

- transparent outer canvas;
- BossAI Quiet OS warm-light panel (`#f7f7f5`);
- restrained dark-ink boundary (`#1f242d`);
- restrained BossAI accent (`#3558c8`);
- three rising capital bars representing `need → committed → received / outcome` progression;
- one rising directional mark for forward capital execution;
- no neon, glow, HUD, AI-gradient, model/provider branding, or marketplace imagery.

## Generated assets

`npm run desktop:prepare-assets` creates ignored build artifacts under `out/desktop-assets/`:

- `bossai-funding.ico` — 16, 24, 32, 48, 64, 128 and 256 px PNG-backed Windows icon entries;
- `bossai-funding-512.png` — 512 px preview/reference image.

Current deterministic engineering hashes for v0.51 source:

```text
bossai-funding.ico
ca679813f9054a43fd34ca18a60d341a2eb81f642675c030ff71817de7835571

bossai-funding-512.png
78c9e64284cbc9816c4efc21b1d1941e7f75bd3bf6fea31a736ed16753661077
```

The build fails downstream if Electron Builder cannot consume the generated icon. The icon is product identity only; it does not grant trademark rights under the AGPL. See `TRADEMARKS.md`.