# Heist in 30 Seconds

A polished vertical slice for **Kupp på 30 sekunder** (Heist in 30 Seconds), built with Phaser 3, Vite and TypeScript.

## Local development

```bash
npm install
npm run dev
```

Open the local Vite URL, then draw one continuous route with mouse or touch from **SAFEHOUSE**, through **BAG**, to **EXIT**. Use Undo or Clear while planning, then press **Run the plan**. The crew follows the captured points in order while guards patrol, cones communicate danger, and a mission timer determines the outcome. Three handcrafted missions unlock in sequence and progress is stored locally in the browser.

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

## Current vertical slice limitations

The sound toggle is a presentation control only; there are no audio assets yet. Guard detection uses a readable proximity cone rather than line-of-sight occlusion, and the route playback samples the drawn points at a constant pace rather than simulating full physics.
