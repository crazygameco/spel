import Phaser from "phaser";
import { getPatrolState, pointInRect, segmentCrossesWall, type Point, type Rect } from "./game/logic";
import "./style.css";

const WIDTH = 960;
const HEIGHT = 600;
type Level = { name: string; subtitle: string; time: number; walls: Rect[]; start: Point; loot: Point; exit: Point; patrol: Point[]; guardSpeed: number; guardRange: number; accent: number };
const LEVELS: Level[] = [
  { name: "The quiet corner", subtitle: "Learn the basics: move, hide, steal, escape.", time: 40, walls: [{ x: 205, y: 0, width: 42, height: 390 }, { x: 205, y: 475, width: 42, height: 125 }, { x: 420, y: 160, width: 42, height: 440 }, { x: 640, y: 0, width: 42, height: 340 }, { x: 780, y: 260, width: 42, height: 340 }], start: { x: 92, y: 510 }, loot: { x: 480, y: 112 }, exit: { x: 866, y: 92 }, patrol: [{ x: 300, y: 120 }, { x: 570, y: 120 }, { x: 570, y: 430 }, { x: 300, y: 430 }], guardSpeed: 1800, guardRange: 125, accent: 0xffc85a },
  { name: "Crossed wires", subtitle: "Two chokepoints. Read the guard, then commit.", time: 35, walls: [{ x: 165, y: 95, width: 330, height: 34 }, { x: 165, y: 471, width: 330, height: 34 }, { x: 610, y: 0, width: 36, height: 280 }, { x: 610, y: 370, width: 36, height: 230 }, { x: 790, y: 160, width: 36, height: 440 }], start: { x: 82, y: 540 }, loot: { x: 535, y: 300 }, exit: { x: 885, y: 72 }, patrol: [{ x: 235, y: 245 }, { x: 535, y: 245 }, { x: 535, y: 380 }, { x: 235, y: 380 }], guardSpeed: 1400, guardRange: 118, accent: 0xff7fb8 },
  { name: "The last window", subtitle: "A short clock and a long shadow. Stay calm.", time: 30, walls: [{ x: 0, y: 205, width: 300, height: 36 }, { x: 390, y: 0, width: 36, height: 270 }, { x: 390, y: 360, width: 36, height: 240 }, { x: 530, y: 205, width: 430, height: 36 }, { x: 690, y: 360, width: 36, height: 240 }], start: { x: 88, y: 520 }, loot: { x: 510, y: 300 }, exit: { x: 870, y: 100 }, patrol: [{ x: 480, y: 105 }, { x: 840, y: 105 }, { x: 840, y: 490 }, { x: 480, y: 490 }], guardSpeed: 1100, guardRange: 110, accent: 0x6eb9ff }
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
  private guard!: Phaser.GameObjects.Container;
  private vision!: Phaser.GameObjects.Graphics;
  private patrolGraphics!: Phaser.GameObjects.Graphics;
  private playerPosition: Point = { x: 0, y: 0 };
  private guardPosition: Point = { x: 0, y: 0 };
  private touchVector: Point = { x: 0, y: 0 };

  constructor() { super("stealth"); }

  create(): void {
    this.level = LEVELS[levelIndex];
    this.cameras.main.setBackgroundColor("#0e1523");
    this.drawMap();
    this.input.keyboard?.on("keydown", (event: KeyboardEvent) => { keys[event.key.toLowerCase()] = true; });
    this.input.keyboard?.on("keyup", (event: KeyboardEvent) => { keys[event.key.toLowerCase()] = false; });
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.updateTouch(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => { if (pointer.isDown) this.updateTouch(pointer); });
    this.input.on("pointerup", () => { this.touchVector = { x: 0, y: 0 }; });
    setupTouchControls((vector) => { this.touchVector = vector; }, () => { this.touchVector = { x: 0, y: 0 }; });
    setLevelText(this.level);
  }

  update(time: number, delta: number): void {
    if (status !== "playing") return;
    const elapsed = (time - startedAt) / 1000;
    const remaining = Math.max(0, this.level.time - elapsed);
    updateTimer(remaining, this.level.time);
    this.moveGuard(time);
    const input = this.getInput();
    this.movePlayer(input, delta / 1000);
    const seen = this.canBeSeen();
    setStealthFeedback(seen ? "EXPOSED — break line of sight!" : hasLoot ? "BAG SECURED — reach the blue exit." : "HIDDEN — move through the shadows.");
    if (seen) {
      showToast("The guard has a clear sightline.");
      finish(false, "You were seen in the open.", "BUSTED");
    } else if (!hasLoot && Phaser.Math.Distance.Between(this.playerPosition.x, this.playerPosition.y, this.level.loot.x, this.level.loot.y) < 28) {
      hasLoot = true;
      setMessage("Bag secured. Now reach the exit.", "good");
      showToast("Loot secured!");
    } else if (hasLoot && Phaser.Math.Distance.Between(this.playerPosition.x, this.playerPosition.y, this.level.exit.x, this.level.exit.y) < 32) {
      finish(true, "You got the bag out clean.", "CLEAN GETAWAY");
    } else if (remaining <= 0) {
      finish(false, "The window closed before you escaped.", "TIME'S UP");
    }
  }

  resetLevel(): void {
    status = "playing";
    hasLoot = false;
    startedAt = this.time.now;
    hideOverlay();
    this.scene.restart();
  }

  nextLevel(): void {
    levelIndex = Math.min(levelIndex + 1, LEVELS.length - 1);
    localStorage.setItem("heist-level", String(levelIndex));
    this.resetLevel();
  }

  private getInput(): Point {
    const x = (keys.d || keys.arrowright ? 1 : 0) - (keys.a || keys.arrowleft ? 1 : 0) + this.touchVector.x;
    const y = (keys.s || keys.arrowdown ? 1 : 0) - (keys.w || keys.arrowup ? 1 : 0) + this.touchVector.y;
    const length = Math.hypot(x, y);
    return length ? { x: x / length, y: y / length } : { x: 0, y: 0 };
  }

  private movePlayer(input: Point, seconds: number): void {
    const speed = 190;
    const next = { x: this.playerPosition.x + input.x * speed * seconds, y: this.playerPosition.y + input.y * speed * seconds };
    const radius = 12;
    const blocked = this.level.walls.some((wall) => pointInRect(next, wall, radius));
    if (!blocked) this.playerPosition = { x: Phaser.Math.Clamp(next.x, radius, WIDTH - radius), y: Phaser.Math.Clamp(next.y, radius, HEIGHT - radius) };
    this.player.setPosition(this.playerPosition.x, this.playerPosition.y);
  }

  private moveGuard(time: number): void {
    const patrol = getPatrolState(time, this.level.patrol, this.level.guardSpeed);
    this.guardPosition = patrol.position;
    this.guard.setPosition(patrol.position.x, patrol.position.y);
    this.vision.clear();
    this.vision.fillStyle(0xff5f7b, 0.16);
    this.vision.beginPath();
    this.vision.moveTo(patrol.position.x, patrol.position.y);
    this.vision.arc(patrol.position.x, patrol.position.y, this.level.guardRange, patrol.heading - 0.62, patrol.heading + 0.62, false);
    this.vision.closePath();
    this.vision.fillPath();
    updateGuardStatus(patrol.segment, patrol.progress, this.level.patrol.length);
  }

  private canBeSeen(): boolean {
    const dx = this.playerPosition.x - this.guardPosition.x;
    const dy = this.playerPosition.y - this.guardPosition.y;
    const distance = Math.hypot(dx, dy);
    if (distance > this.level.guardRange) return false;
    const patrol = getPatrolState(this.time.now, this.level.patrol, this.level.guardSpeed);
    const angle = Math.atan2(dy, dx);
    const difference = Math.atan2(Math.sin(angle - patrol.heading), Math.cos(angle - patrol.heading));
    return Math.abs(difference) < 0.62 && !this.level.walls.some((wall) => segmentCrossesWall(this.guardPosition, this.playerPosition, [wall]));
  }

  private updateTouch(pointer: Phaser.Input.Pointer): void {
    const center = { x: this.scale.width * 0.5, y: this.scale.height * 0.8 };
    const dx = pointer.x - center.x;
    const dy = pointer.y - center.y;
    const length = Math.max(1, Math.hypot(dx, dy));
    this.touchVector = length < 150 ? { x: dx / length, y: dy / length } : { x: 0, y: 0 };
  }

  private drawMap(): void {
    const { walls, start, loot, exit } = this.level;
    const map = this.add.graphics();
    map.fillStyle(0x111b2b).fillRect(0, 0, WIDTH, HEIGHT);
    map.lineStyle(1, 0x223149, 0.75);
    for (let x = 0; x <= WIDTH; x += 40) map.lineBetween(x, 0, x, HEIGHT);
    for (let y = 0; y <= HEIGHT; y += 40) map.lineBetween(0, y, WIDTH, y);
    walls.forEach((wall) => { map.fillStyle(0x2b3c58).fillRoundedRect(wall.x, wall.y, wall.width, wall.height, 7); map.lineStyle(2, 0x516987, 0.8).strokeRoundedRect(wall.x, wall.y, wall.width, wall.height, 7); });
    this.patrolGraphics = this.add.graphics().setDepth(1);
    for (let i = 0; i < this.level.patrol.length; i += 1) {
      const from = this.level.patrol[i]; const to = this.level.patrol[(i + 1) % this.level.patrol.length];
      for (let d = 0; d < Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y); d += 20) {
        const length = Phaser.Math.Distance.Between(from.x, from.y, to.x, to.y); const t1 = d / length; const t2 = Math.min(1, (d + 10) / length);
        this.patrolGraphics.lineStyle(2, 0xff718c, 0.65).lineBetween(Phaser.Math.Linear(from.x, to.x, t1), Phaser.Math.Linear(from.y, to.y, t1), Phaser.Math.Linear(from.x, to.x, t2), Phaser.Math.Linear(from.y, to.y, t2));
      }
    }
    marker(this, start, 0x5be3ae, "SAFEHOUSE", "⌂"); marker(this, loot, 0xffc85a, "BAG", "◆"); marker(this, exit, this.level.accent, "EXIT", "↗");
    this.playerPosition = { ...start };
    this.player = this.add.container(start.x, start.y).setDepth(7); this.player.add(this.add.circle(0, 0, 11, 0x9b83ff).setStrokeStyle(3, 0xe2dfff)); this.player.add(this.add.circle(0, 0, 3, 0xffffff));
    this.vision = this.add.graphics().setDepth(2);
    this.guardPosition = { ...this.level.patrol[0] };
    this.guard = this.add.container(this.guardPosition.x, this.guardPosition.y).setDepth(6); this.guard.add(this.add.circle(0, 0, 14, 0xff5f7b).setStrokeStyle(3, 0xffb0be)); this.guard.add(this.add.circle(0, 0, 5, 0x421928));
    updateGuardStatus(0, 0, this.level.patrol.length);
  }
}

function marker(scene: Phaser.Scene, point: Point, color: number, label: string, icon: string): void {
  scene.add.circle(point.x, point.y, 24, color, 0.1).setStrokeStyle(2, color);
  scene.add.text(point.x - 7, point.y - 10, icon, { fontSize: "18px", color: `#${color.toString(16).padStart(6, "0")}`, fontStyle: "bold" });
  scene.add.text(point.x - label.length * 3.4, point.y + 27, label, { fontSize: "10px", color: `#${color.toString(16).padStart(6, "0")}`, fontStyle: "bold" });
}
function finish(won: boolean, copy: string, title: string): void { status = won ? "won" : "lost"; if (won) localStorage.setItem("heist-level", String(Math.min(levelIndex + 1, LEVELS.length - 1))); showOverlay(won, title, copy); }
function setMessage(message: string, tone: "normal" | "good" | "bad" = "normal"): void { $("#message").textContent = message; $("#status-dot").className = `status-dot ${tone === "normal" ? "" : tone}`; }
function setStealthFeedback(message: string): void { $("#stealth-state").textContent = message; }
function updateTimer(seconds: number, total: number): void { const timer = $("#timer"); timer.textContent = `${seconds.toFixed(1)}s`; timer.style.color = seconds < total * 0.25 ? "#ff6b87" : ""; }
function updateGuardStatus(segment: number, progress: number, count: number): void { $("#guard-status").textContent = `LEG ${segment + 1}/${count} · ${Math.round(progress * 100)}%`; }
function setLevelText(level: Level): void { $("#level-label").textContent = `${String(levelIndex + 1).padStart(2, "0")} / 03`; $("#mission-title").textContent = `${level.name} — ${level.subtitle}`; updateTimer(level.time, level.time); }
function showToast(message: string): void { const toast = $("#toast"); toast.textContent = message; toast.classList.add("show"); window.setTimeout(() => toast.classList.remove("show"), 1800); }
function showOverlay(won: boolean, title: string, copy: string): void { $("#result-overlay").hidden = false; $("#result-icon").textContent = won ? "✦" : "!"; $("#result-kicker").textContent = won ? "MISSION COMPLETE" : "MISSION FAILED"; $("#result-title").textContent = title; $("#result-copy").textContent = copy; $("#result-primary").textContent = won && levelIndex < LEVELS.length - 1 ? "Next mission" : "Try again"; }
function hideOverlay(): void { $("#result-overlay").hidden = true; }
function setupTouchControls(onMove: (vector: Point) => void, onStop: () => void): void { const pad = $("#touch-pad"); let active = false; pad.addEventListener("pointerdown", () => { active = true; }); pad.addEventListener("pointermove", (event) => { if (!active) return; const rect = pad.getBoundingClientRect(); const dx = event.clientX - (rect.left + rect.width / 2); const dy = event.clientY - (rect.top + rect.height / 2); const length = Math.max(1, Math.hypot(dx, dy)); onMove({ x: dx / length, y: dy / length }); }); pad.addEventListener("pointerup", () => { active = false; onStop(); }); pad.addEventListener("pointercancel", () => { active = false; onStop(); }); }

$("#result-secondary").addEventListener("click", () => scene.resetLevel());
$("#result-primary").addEventListener("click", () => status === "won" && levelIndex < LEVELS.length - 1 ? scene.nextLevel() : scene.resetLevel());
$("#sound-toggle").addEventListener("click", (event) => { soundOn = !soundOn; const button = event.currentTarget as HTMLButtonElement; button.textContent = soundOn ? "🔊" : "🔇"; });
let scene = new StealthScene();
new Phaser.Game({ type: Phaser.AUTO, parent: "game", width: WIDTH, height: HEIGHT, scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, scene });
startedAt = scene.time.now;
