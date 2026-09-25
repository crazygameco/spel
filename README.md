# Heist in 30 Seconds

A first playable web prototype for **Kupp på 30 sekunder** (Heist in 30 Seconds), built with Phaser 3, Vite and TypeScript.

## Local development

```bash
npm install
npm run dev
```

Open the local Vite URL, then draw one continuous route with mouse or touch from **START**, through **LOOT**, to **EXIT**. Press **Run the plan** only after the route is valid. The playback is deterministic: the crew follows the captured points in order, while a looping guard patrol and a 30-second timer determine the outcome.

## Checks

```bash
npm test
npm run build
```

The tests cover wall crossings, loot/exit passage, invalid routes, and repeatable route evaluation. The build command includes the TypeScript check.

## CrazyGames test checklist

- Run `npm run build` and serve the generated `dist/` folder from a static HTTPS host.
- Test desktop mouse and mobile touch input in portrait and landscape widths.
- Confirm the first interaction starts at START and only one connected route can be drawn.
- Confirm blocked routes and routes missing LOOT or EXIT cannot be run.
- Confirm the guard vision, detection loss, timeout loss, successful escape, and restart/change-plan flows.
- Confirm the sound toggle remains optional and that no ads, SDK, backend, account, or login are requested.
