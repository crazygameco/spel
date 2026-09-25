# Heist in 30 Seconds

A polished single-player stealth vertical slice for **Kupp på 30 sekunder** (Heist in 30 Seconds), built with Phaser 3, Vite and TypeScript.

## Local development

```bash
npm install
npm run dev
```

Open the local Vite URL and move the crew with **WASD/arrow keys**. On mobile, drag the on-screen thumb pad. Reach the gold bag, then the blue exit, while using walls to break the guards' red cones. Press **Space** or the **Stun** button to use a limited non-lethal stun charge; it disables one nearby guard briefly and then recharges on cooldown. Dashed patrol routes, traps, guard count, stun charges, and stealth state are visible in the HUD. Ten handcrafted missions unlock in sequence and progress is stored locally in the browser. The fullscreen button uses the browser Fullscreen API when available.

## Checks

```bash
npm test
npm run build
```

The tests cover wall crossings, loot/exit passage, invalid routes, repeatable route evaluation, actionable plan validation, runner clearance, patrol state, and solid wall blocking. The build command includes the TypeScript check.

## CrazyGames test checklist

- Run `npm run build` and serve the generated `dist/` folder from a static HTTPS host.
- Test desktop mouse and mobile touch input in portrait and landscape widths.
- Confirm the first level teaches direct movement, hiding, a non-lethal stun, loot, and escape without requiring route drawing.
- Confirm solid wall collision, trap failure, multiple guard vision, stun cooldown/ammo feedback, timeout loss, successful escape, restart, and next-level flows.
- Confirm fullscreen entry/exit and responsive HUD/touch controls in portrait and landscape.
- Confirm the sound toggle remains optional and that no ads, SDK, backend, account, or login are requested.
- Confirm local progress survives a refresh and that mission 10 replays instead of attempting to unlock an eleventh mission.

## Current vertical slice limitations

The sound toggle is a presentation control only; there are no audio assets yet. Guard vision is a readable directional cone with wall occlusion rather than full lighting/physics. Traps are rectangular telegraphed hazards, and stun targeting is a simple directional/range interaction. Multiplayer is intentionally deferred: the current architecture keeps deterministic level/state logic in the client so a future network layer can be added after the solo loop proves fun.
