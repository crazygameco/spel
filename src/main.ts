import Phaser from "phaser";
import { canUseStun, getPatrolState, pointInRect, segmentCrossesWall, type Point, type Rect } from "./game/logic";
import "./style.css";

const WIDTH = 960;
const HEIGHT = 600;
type GuardSpec = { patrol: Point[]; speed: number; range: number };
type Level = { name: string; subtitle: string; time: number; walls: Rect[]; traps: Rect[]; start: Point; loot: Point; exit: Point; guards: GuardSpec[]; stuns: number; accent: number };

const wallsA: Rect[] = [{ x: 205, y: 0, width: 42, height: 390 }, { x: 205, y: 475, width: 42, height: 125 }, { x: 420, y: 160, width: 42, height: 440 }, { x: 640, y: 0, width: 42, height: 340 }, { x: 780, y: 260, width: 42, height: 340 }];
const wallsB: Rect[] = [{ x: 165, y: 95, width: 330, height: 34 }, { x: 165, y: 471, width: 330, height: 34 }, { x: 610, y: 0, width: 36, height: 280 }, { x: 610, y: 370, width: 36, height: 230 }, { x: 790, y: 160, width: 36, height: 440 }];
const wallsC: Rect[] = [{ x: 0, y: 205, width: 300, height: 36 }, { x: 390, y: 0, width: 36, height: 270 }, { x: 390, y: 360, width: 36, height: 240 }, { x: 530, y: 205, width: 430, height: 36 }, { x: 690, y: 360, width: 36, height: 240 }];
const guardA: GuardSpec = { patrol: [{ x: 300, y: 120 }, { x: 570, y: 120 }, { x: 570, y: 430 }, { x: 300, y: 430 }], speed: 1800, range: 125 };
const guardB: GuardSpec = { patrol: [{ x: 235, y: 245 }, { x: 535, y: 245 }, { x: 535, y: 380 }, { x: 235, y: 380 }], speed: 1400, range: 118 };
const guardC: GuardSpec = { patrol: [{ x: 480, y: 105 }, { x: 840, y: 105 }, { x: 840, y: 490 }, { x: 480, y: 490 }], speed: 1100, range: 110 };
const LEVELS: Level[] = [
  { name: "The quiet corner", subtitle: "Learn movement, cover, and the stun tool.", time: 45, walls: wallsA, traps: [], start: { x: 92, y: 510 }, loot: { x: 480, y: 112 }, exit: { x: 866, y: 92 }, guards: [guardA], stuns: 2, accent: 0xffc85a },
  { name: "Crossed wires", subtitle: "One guard, two chokepoints. Time the crossing.", time: 40, walls: wallsB, traps: [{ x: 300, y: 175, width: 42, height: 42 }], start: { x: 82, y: 540 }, loot: { x: 535, y: 300 }, exit: { x: 885, y: 72 }, guards: [guardB], stuns: 2, accent: 0xff7fb8 },
  { name: "The last window", subtitle: "Short clock. Long shadow. Stay calm.", time: 35, walls: wallsC, traps: [{ x: 500, y: 430, width: 48, height: 30 }], start: { x: 88, y: 520 }, loot: { x: 510, y: 300 }, exit: { x: 870, y: 100 }, guards: [guardC], stuns: 2, accent: 0x6eb9ff },
  { name: "Double blind", subtitle: "Two patrols overlap. Use the safe pockets.", time: 42, walls: wallsA, traps: [{ x: 280, y: 460, width: 55, height: 28 }], start: { x: 92, y: 510 }, loot: { x: 480, y: 112 }, exit: { x: 866, y: 92 }, guards: [guardA, { ...guardC, speed: 2100 }], stuns: 2, accent: 0xff9b68 },
  { name: "Hot floor", subtitle: "Traps telegraph danger. Never rush a corner.", time: 44, walls: wallsB, traps: [{ x: 280, y: 175, width: 48, height: 42 }, { x: 690, y: 70, width: 52, height: 36 }], start: { x: 82, y: 540 }, loot: { x: 535, y: 300 }, exit: { x: 885, y: 72 }, guards: [guardB, { ...guardA, speed: 2300 }], stuns: 3, accent: 0xffd16c },
  { name: "One clean shot", subtitle: "A stun buys time, not a free pass.", time: 38, walls: wallsC, traps: [{ x: 475, y: 120, width: 52, height: 32 }], start: { x: 88, y: 520 }, loot: { x: 510, y: 300 }, exit: { x: 870, y: 100 }, guards: [guardC, { ...guardB, speed: 1250 }], stuns: 1, accent: 0xb88cff },
  { name: "The gauntlet", subtitle: "Three patrols, one route through the dark.", time: 50, walls: wallsA, traps: [{ x: 280, y: 410, width: 48, height: 38 }, { x: 690, y: 180, width: 48, height: 38 }], start: { x: 92, y: 510 }, loot: { x: 480, y: 112 }, exit: { x: 866, y: 92 }, guards: [guardA, guardB, guardC], stuns: 3, accent: 0xff718c },
  { name: "Narrow margin", subtitle: "The exit is close. The safe line is not.", time: 34, walls: wallsB, traps: [{ x: 520, y: 160, width: 45, height: 45 }, { x: 700, y: 395, width: 50, height: 30 }], start: { x: 82, y: 540 }, loot: { x: 535, y: 300 }, exit: { x: 885, y: 72 }, guards: [guardB, guardC], stuns: 2, accent: 0xff6eb9 },
  { name: "Master key", subtitle: "Every system is live. Make your own opening.", time: 48, walls: wallsC, traps: [{ x: 280, y: 280, width: 50, height: 35 }, { x: 550, y: 290, width: 50, height: 35 }], start: { x: 88, y: 520 }, loot: { x: 510, y: 300 }, exit: { x: 870, y: 100 }, guards: [guardA, guardC], stuns: 2, accent: 0xffc85a },
  { name: "The impossible job", subtitle: "The city is awake. Leave no trace.", time: 52, walls: wallsA, traps: [{ x: 275, y: 420, width: 55, height: 32 }, { x: 685, y: 375, width: 55, height: 32 }, { x: 480, y: 70, width: 55, height: 32 }], start: { x: 92, y: 510 }, loot: { x: 480, y: 112 }, exit: { x: 866, y: 92 }, guards: [guardA, guardB, guardC], stuns: 3, accent: 0x5be3ae }
];

type Status = "playing" | "won" | "lost";
const saved = Number(localStorage.getItem("heist-level") ?? "0");
let levelIndex = Number.isInteger(saved) ? Phaser.Math.Clamp(saved, 0, LEVELS.length - 1) : 0;
let status: Status = "playing";
let startedAt = 0;
let hasLoot = false;
let soundOn = true;
const keys: Record<string, boolean> = {};
const $ = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;

class StealthScene extends Phaser.Scene {
  private level!: Level;
  private player!: Phaser.GameObjects.Container;
  private guards: Array<{ body: Phaser.GameObjects.Container; spec: GuardSpec; stunnedUntil: number }> = [];
  private vision!: Phaser.GameObjects.Graphics;
  private playerPosition: Point = { x: 0, y: 0 };
  private touchVector: Point = { x: 0, y: 0 };
  private facing: Point = { x: 1, y: 0 };
  private stunCharges = 0;
  private cooldownUntil = 0;

  constructor() { super("stealth"); }

  create(): void {
    this.level = LEVELS[levelIndex];
    this.stunCharges = this.level.stuns;
    this.cameras.main.setBackgroundColor("#0e1523");
    this.drawMap();
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => {
      keys[event.key.toLowerCase()] = true;
      if (event.key === " " || event.key.toLowerCase() === "e") this.stun();
    });
    this.input.keyboard?.on("keyup", (event: KeyboardEvent) => { keys[event.key.toLowerCase()] = false; });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.updateTouch(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => { if (pointer.isDown) this.updateTouch(pointer); });
    this.input.on("pointerup", () => { this.touchVector = { x: 0, y: 0 }; });
    setupTouchControls((vector) => { this.touchVector = vector; }, () => { this.touchVector = { x: 0, y: 0 }; });
    setLevelText(this.level);
  }

  update(time: number, delta: number): void {
    if (status !== "playing") return;
    const remaining = Math.max(0, this.level.time - (time - startedAt) / 1000);
    updateTimer(remaining, this.level.time);
    this.moveGuards(time);
    this.movePlayer(this.getInput(), delta / 1000);
    if (this.level.traps.some((trap) => pointInRect(this.playerPosition, trap, 10))) { finish(false, "A floor alarm caught your step.", "TRAP TRIGGERED"); return; }
    const seen = this.canBeSeen(time);
    setStealthFeedback(seen ? "EXPOSED — break line of sight!" : hasLoot ? "BAG SECURED — reach the blue exit." : "HIDDEN — move through the shadows.");
    if (seen) finish(false, "A guard found a clear sightline.", "BUSTED");
    else if (!hasLoot && Phaser.Math.Distance.Between(this.playerPosition.x, this.playerPosition.y, this.level.loot.x, this.level.loot.y) < 28) { hasLoot = true; setMessage("Bag secured. Now reach the exit.", "good"); showToast("Loot secured!"); }
    else if (hasLoot && Phaser.Math.Distance.Between(this.playerPosition.x, this.playerPosition.y, this.level.exit.x, this.level.exit.y) < 32) finish(true, "You got the bag out clean.", "CLEAN GETAWAY");
    else if (remaining <= 0) finish(false, "The window closed before you escaped.", "TIME'S UP");
  }

  resetLevel(): void { status = "playing"; hasLoot = false; startedAt = this.time.now; hideOverlay(); this.scene.restart(); }
  nextLevel(): void { levelIndex = Math.min(levelIndex + 1, LEVELS.length - 1); localStorage.setItem("heist-level", String(levelIndex)); this.resetLevel(); }
  stun(): void {
    if (status !== "playing") return;
    if (this.stunCharges <= 0) { showToast("No stun charges left."); return; }
    if (!canUseStun(this.stunCharges, this.time.now, this.cooldownUntil)) { showToast("Stun is recharging."); return; }
    const target = this.guards.find((guard) => {
      const dx = guard.body.x - this.playerPosition.x; const dy = guard.body.y - this.playerPosition.y;
      return Math.hypot(dx, dy) < 150 && (dx * this.facing.x + dy * this.facing.y) > 0;
    });
    if (!target) { showToast("Aim toward a guard within range."); return; }
    target.stunnedUntil = this.time.now + 5000;
    this.stunCharges -= 1; this.cooldownUntil = this.time.now + 3000;
    updateStuns(this.stunCharges); showToast("Guard stunned for 5 seconds.");
  }

  private getInput(): Point {
    const x = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + this.touchVector.x;
    const y = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0) + this.touchVector.y;
    const length = Math.hypot(x, y);
    if (!length) return { x: 0, y: 0 };
    this.facing = { x: x / length, y: y / length };
    return this.facing;
  }
  private movePlayer(input: Point, seconds: number): void {
    const next = { x: this.playerPosition.x + input.x * 190 * seconds, y: this.playerPosition.y + input.y * 190 * seconds };
    if (!this.level.walls.some((wall) => pointInRect(next, wall, 12))) this.playerPosition = { x: Phaser.Math.Clamp(next.x, 12, WIDTH - 12), y: Phaser.Math.Clamp(next.y, 12, HEIGHT - 12) };
    this.player.setPosition(this.playerPosition.x, this.playerPosition.y);
  }
  private moveGuards(time: number): void {
    this.guards.forEach((guard, index) => {
      if (guard.stunnedUntil > time) { guard.body.alpha = 0.45; return; }
      guard.body.alpha = 1;
      const state = getPatrolState(time + index * 300, guard.spec.patrol, guard.spec.speed);
      guard.body.setPosition(state.position.x, state.position.y);
      updateGuardStatus(this.guards.length, this.guards.filter((item) => item.stunnedUntil > time).length);
    });
    this.vision.clear();
    this.guards.forEach((guard, index) => {
      if (guard.stunnedUntil > time) return;
      const state = getPatrolState(time + index * 300, guard.spec.patrol, guard.spec.speed);
      this.vision.fillStyle(0xff5f7b, 0.13);
      this.vision.beginPath(); this.vision.moveTo(state.position.x, state.position.y); this.vision.arc(state.position.x, state.position.y, guard.spec.range, state.heading - 0.62, state.heading + 0.62, false); this.vision.closePath(); this.vision.fillPath();
    });
  }
  private canBeSeen(time: number): boolean {
    return this.guards.some((guard, index) => {
      if (guard.stunnedUntil > time) return false;
      const state = getPatrolState(time + index * 300, guard.spec.patrol, guard.spec.speed);
      const dx = this.playerPosition.x - state.position.x; const dy = this.playerPosition.y - state.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance > guard.spec.range) return false;
      const angle = Math.atan2(dy, dx); const delta = Math.atan2(Math.sin(angle - state.heading), Math.cos(angle - state.heading));
      return Math.abs(delta) < 0.62 && !this.level.walls.some((wall) => segmentCrossesWall(state.position, this.playerPosition, [wall]));
    });
  }
  private updateTouch(pointer: Phaser.Input.Pointer): void { const center = { x: this.scale.width * 0.5, y: this.scale.height * 0.8 }; const dx = pointer.x - center.x; const dy = pointer.y - center.y; const length = Math.max(1, Math.hypot(dx, dy)); this.touchVector = length < 150 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 }; }
  private drawMap(): void {
    const map = this.add.graphics(); map.fillStyle(0x111b2b).fillRect(0, 0, WIDTH, HEIGHT); map.lineStyle(1, 0x223149, 0.75);
    for (let x = 0; x <= WIDTH; x += 40) map.lineBetween(x, 0, x, HEIGHT); for (let y = 0; y <= HEIGHT; y += 40) map.lineBetween(0, y, WIDTH, y);
    this.level.walls.forEach((wall) => { map.fillStyle(0x2b3c58).fillRoundedRect(wall.x, wall.y, wall.width, wall.height, 7); map.lineStyle(2, 0x516987, 0.8).strokeRoundedRect(wall.x, wall.y, wall.width, wall.height, 7); });
    this.level.traps.forEach((trap) => { map.fillStyle(0xff5f7b, 0.28).fillRect(trap.x, trap.y, trap.width, trap.height); map.lineStyle(1, 0xff91a7, 0.8).strokeRect(trap.x, trap.y, trap.width, trap.height); });
    this.level.guards.forEach((guard) => drawPatrol(this, guard.patrol));
    marker(this, this.level.start, 0x5be3ae, "SAFEHOUSE", "⌂"); marker(this, this.level.loot, 0xffc85a, "BAG", "◆"); marker(this, this.level.exit, this.level.accent, "EXIT", "↗");
    this.playerPosition = { ...this.level.start }; this.player = this.add.container(this.playerPosition.x, this.playerPosition.y).setDepth(7); this.player.add(this.add.circle(0, 0, 11, 0x9b83ff).setStrokeStyle(3, 0xe2dfff)); this.player.add(this.add.circle(0, 0, 3, 0xffffff));
    this.vision = this.add.graphics().setDepth(2);
    this.level.guards.forEach((spec) => { const body = this.add.container(spec.patrol[0].x, spec.patrol[0].y).setDepth(6); body.add(this.add.circle(0, 0, 14, 0xff5f7b).setStrokeStyle(3, 0xffb0be)); body.add(this.add.circle(0, 0, 5, 0x421928)); this.guards.push({ body, spec, stunnedUntil: 0 }); });
    updateGuardStatus(this.guards.length, 0);
  }
}

function drawPatrol(scene: Phaser.Scene, points: Point[]): void { const graphics = scene.add.graphics().setDepth(1); for (let i = 0; i < points.length; i += 1) { const from = points[i]; const to = points[(i + 1) % points.length]; const length = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y); for (let d = 0; d < length; d += 20) { const a = d / length; const b = Math.min(1, (d + 10) / length); graphics.lineStyle(2, 0xff718c, 0.55).lineBetween(Phaser.Math.Linear(from.x, to.x, a), Phaser.Math.Linear(from.y, to.y, a), Phaser.Math.Linear(from.x, to.x, b), Phaser.Math.Linear(from.y, to.y, b)); } } }
function marker(scene: Phaser.Scene, point: Point, color: number, label: string, icon: string): void { scene.add.circle(point.x, point.y, 24, color, 0.1).setStrokeStyle(2, color); scene.add.text(point.x - 7, point.y - 10, icon, { fontSize: "18px", color: `#${color.toString(16).padStart(6, "0")}`, fontStyle: "bold" }); scene.add.text(point.x - label.length * 3.4, point.y + 27, label, { fontSize: "10px", color: `#${color.toString(16).padStart(6, "0")}`, fontStyle: "bold" }); }
function finish(won: boolean, copy: string, title: string): void { status = won ? "won" : "lost"; if (won) localStorage.setItem("heist-level", String(Math.min(levelIndex + 1, LEVELS.length - 1))); showOverlay(won, title, copy); }
function setMessage(message: string, tone: "normal" | "good" | "bad" = "normal"): void { $("#message").textContent = message; $("#status-dot").className = `status-dot ${tone === "normal" ? "" : tone}`; }
function setStealthFeedback(message: string): void { $("#stealth-state").textContent = message; }
function updateTimer(seconds: number, total: number): void { const timer = $("#timer"); timer.textContent = `${seconds.toFixed(1)}s`; timer.style.color = seconds < total * 0.25 ? "#ff6b87" : ""; }
function updateStuns(count: number): void { $("#stun-count").textContent = String(count).padStart(2, "0"); $("#stun-button").toggleAttribute("disabled", count === 0); }
function updateGuardStatus(count: number, stunned: number): void { $("#guard-status").textContent = `${count} GUARDS · ${stunned} STUNNED`; }
function setLevelText(level: Level): void { $("#level-label").textContent = `${String(levelIndex + 1).padStart(2, "0")} / 10`; $("#mission-title").textContent = `${level.name} — ${level.subtitle}`; updateTimer(level.time, level.time); updateStuns(level.stuns); }
function showToast(message: string): void { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); window.setTimeout(() => toast.classList.remove("show"), 1800); }
function showOverlay(won: boolean, title: string, copy: string): void { $("#result-overlay").hidden = false; $("#result-icon").textContent = won ? "✦" : "!"; $("#result-kicker").textContent = won ? "MISSION COMPLETE" : "MISSION FAILED"; $("#result-title").textContent = title; $("#result-copy").textContent = copy; $("#result-primary").textContent = won && levelIndex < LEVELS.length - 1 ? "Next mission" : "Try again"; }
function hideOverlay(): void { $("#result-overlay").hidden = true; }
function setupTouchControls(onMove: (vector: Point) => void, onStop: () => void): void { const pad = $("#touch-pad"); let active = false; pad.addEventListener("pointerdown", () => { active = true; }); pad.addEventListener("pointermove", (event) => { if (!active) return; const rect = pad.getBoundingClientRect(); const dx = event.clientX - (rect.left + rect.width / 2); const dy = event.clientY - (rect.top + rect.height / 2); const length = Math.max(1, Math.hypot(dx, dy)); onMove({ x: dx / length, y: dy / length }); }); pad.addEventListener("pointerup", () => { active = false; onStop(); }); pad.addEventListener("pointercancel", () => { active = false; onStop(); }); }

let scene = new StealthScene();
$("#retry-button").addEventListener("click", () => scene.resetLevel());
$("#stun-button").addEventListener("click", () => scene.stun());
$("#result-secondary").addEventListener("click", () => scene.resetLevel());
$("#result-primary").addEventListener("click", () => status === "won" && levelIndex < LEVELS.length - 1 ? scene.nextLevel() : scene.resetLevel());
$("#fullscreen-toggle").addEventListener("click", () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.(); });
$("#sound-toggle").addEventListener("click", (event) => { soundOn = !soundOn; const button = event.currentTarget as HTMLButtonElement; button.textContent = soundOn ? "🔊" : "🔇"; });
new Phaser.Game({ type: Phaser.AUTO, parent: "game", width: WIDTH, height: HEIGHT, scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, scene });
startedAt = scene.time.now;
