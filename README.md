# Heist in 30 Seconds

A polished single-player stealth vertical slice for **Kupp på 30 sekunder** (Heist in 30 Seconds), built with Phaser 3, Vite and TypeScript.

## Local development

```bash
npm install
npm run dev
```

Open the local Vite URL and move the crew with **WASD/arrow keys**. On mobile, drag the on-screen thumb pad. Reach the gold bag, then the blue exit, while using walls to break the guard's red cone. Patrol routes are shown as dashed paths and the HUD reports the guard's current leg and your stealth state. Three handcrafted missions unlock in sequence and progress is stored locally in the browser.

## Checks

```bash
npm test
npm run build
```

The tests cover wall crossings, loot/exit passage, invalid routes, repeatable route evaluation, and actionable plan validation. The build command includes the TypeScript check.

## CrazyGames test checklist

- Run `npm run build` and serve the generated `dist/` folder from a static HTTPS host.
- Test desktop mouse and mobile touch input in portrait and landscape widths.
- Confirm the first interaction starts at START and only one connected route can be drawn.
- Confirm blocked routes and routes missing LOOT or EXIT cannot be run.
- Confirm the guard vision, detection loss, timeout loss, successful escape, and restart/change-plan flows.
- Confirm the sound toggle remains optional and that no ads, SDK, backend, account, or login are requested.
- Confirm local progress survives a refresh and that the final mission replays instead of attempting to unlock a fourth mission.
- Confirm keyboard movement, touch-pad movement, solid wall blocking, line-of-sight detection, loot-then-exit sequencing, restart, and progression.

## Current vertical slice limitations

The sound toggle is a presentation control only; there are no audio assets yet. Guard vision is a readable directional cone with wall occlusion rather than full lighting/physics. Multiplayer is intentionally deferred: the current architecture keeps level/state logic in the client so a future network layer can be added after the solo loop proves fun.
