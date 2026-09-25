import Phaser from "phaser";
import { validatePlan, type Point, type Rect } from "./game/logic";
import "./style.css";

const WIDTH = 960;
const HEIGHT = 600;
type PatrolPoint = Point & { pause?: number };
type Level = {
  name: string;
  subtitle: string;
  time: number;
  walls: Rect[];
  start: Point;
  loot: Point;
  exit: Point;
  patrol: PatrolPoint[];
  guardSpeed: number;
  guardRange: number;
  accent: number;
};

const LEVELS: Level[] = [
  {
    name: "The quiet corner",
    subtitle: "A soft first job. Learn the rhythm, then move.",
    time: 30,
    walls: [{ x: 205, y: 0, width: 42, height: 390 }, { x: 205, y: 475, width: 42, height: 125 }, { x: 420, y: 160, width: 42, height: 440 }, { x: 640, y: 0, width: 42, height: 340 }, { x: 780, y: 260, width: 42, height: 340 }],
    start: { x: 92, y: 510 }, loot: { x: 480, y: 112 }, exit: { x: 866, y: 92 },
    patrol: [{ x: 300, y: 120 }, { x: 570, y: 120 }, { x: 570, y: 430 }, { x: 300, y: 430 }], guardSpeed: 1800, guardRange: 120, accent: 0xffc85a
  },
  {
    name: "Crossed wires",
    subtitle: "Two guards, tighter corners. Draw with intent.",
    time: 27,
    walls: [{ x: 165, y: 95, width: 330, height: 34 }, { x: 165, y: 471, width: 330, height: 34 }, { x: 610, y: 0, width: 36, height: 280 }, { x: 610, y: 370, width: 36, height: 230 }, { x: 790, y: 160, width: 36, height: 440 }],
    start: { x: 82, y: 540 }, loot: { x: 535, y: 300 }, exit: { x: 885, y: 72 },
    patrol: [{ x: 235, y: 245 }, { x: 535, y: 245 }, { x: 535, y: 380 }, { x: 235, y: 380 }], guardSpeed: 1350, guardRange: 112, accent: 0xff7fb8
  },
  {
    name: "The last window",
    subtitle: "The clock is cruel. The route must be beautiful.",
    time: 24,
    walls: [{ x: 0, y: 205, width: 300, height: 36 }, { x: 390, y: 0, width: 36, height: 270 }, { x: 390, y: 360, width: 36, height: 240 }, { x: 530, y: 205, width: 430, height: 36 }, { x: 690, y: 360, width: 36, height: 240 }],
    start: { x: 88, y: 520 }, loot: { x: 510, y: 300 }, exit: { x: 870, y: 100 },
    patrol: [{ x: 480, y: 105 }, { x: 840, y: 105 }, { x: 840, y: 490 }, { x: 480, y: 490 }], guardSpeed: 1050, guardRange: 105, accent: 0x6eb9ff
  }
];

type GameStatus = "planning" | "running" | "won" | "lost";
const savedLevel = Number(localStorage.getItem("heist-level") ?? "0");
let levelIndex = Number.isInteger(savedLevel) ? Phaser.Math.Clamp(savedLevel, 0, LEVELS.length - 1) : 0;
let status: GameStatus = "planning";
let route: Point[] = [];
let soundOn = true;
let scene: HeistScene;
let startedAt = 0;
let planDuration = 1;

const $ = <T extends HTMLElement>(selector: string): T => document.querySelector<T>(selector)!;

class HeistScene extends Phaser.Scene {
  private routeGraphics!: Phaser.GameObjects.Graphics;
  private mapGraphics!: Phaser.GameObjects.Graphics;
  private visionGraphics!: Phaser.GameObjects.Graphics;
  private guard!: Phaser.GameObjects.Container;
  private actor!: Phaser.GameObjects.Container;
  private drawing = false;
  private guardPosition: Point = { x: 0, y: 0 };
  private level!: Level;

  constructor() { super("heist"); }

  create(): void {
    this.level = LEVELS[levelIndex];
    this.cameras.main.setBackgroundColor("#0e1523");
    this.mapGraphics = this.add.graphics();
    this.visionGraphics = this.add.graphics().setDepth(2);
    this.routeGraphics = this.add.graphics().setDepth(4);
    this.drawMap();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.beginRoute(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.extendRoute(pointer));
    this.input.on("pointerup", () => { this.drawing = false; });
    setLevelText(this.level);
  }

  update(time: number): void {
    if (status !== "running") return;
    const elapsed = (time - startedAt) / 1000;
    const remaining = Math.max(0, this.level.time - elapsed);
    updateTimer(remaining, this.level.time);
    this.moveGuard(time);
    const progress = Math.min(1, elapsed / planDuration);
    const actorPoint = route[Math.min(route.length - 1, Math.floor(progress * (route.length - 1)))];
    if (actorPoint) {
      this.actor.setPosition(actorPoint.x, actorPoint.y);
      if (this.detected(actorPoint)) {
        finish(false, "The guard caught a glimpse of you.", "SPOTTED");
        return;
      }
    }
    if (elapsed >= this.level.time) finish(false, "The window closed before the crew got out.", "TIME'S UP");
    else if (progress >= 1) finish(true, "The bag is safe and the crew is already gone.", "CLEAN GETAWAY");
  }

  resetDrawing(): void {
    route = [];
    status = "planning";
    this.scene.restart();
    updateTimer(LEVELS[levelIndex].time, LEVELS[levelIndex].time);
    setPlanState("planning");
    hideOverlay();
  }

  private beginRoute(pointer: Phaser.Input.Pointer): void {
    if (status !== "planning") return;
    const point = this.pointerPoint(pointer);
    if (Phaser.Math.Distance.Between(point.x, point.y, this.level.start.x, this.level.start.y) > 45) {
      showToast("Start at the green safehouse.");
      return;
    }
    this.drawing = true;
    route = [this.level.start];
    this.drawRoute();
    setMessage("Good. Sweep through the bag and finish at the blue exit.", "good");
  }

  private extendRoute(pointer: Phaser.Input.Pointer): void {
    if (!this.drawing || status !== "planning") return;
    const point = this.pointerPoint(pointer);
    const last = route[route.length - 1];
    if (Phaser.Math.Distance.Between(point.x, point.y, last.x, last.y) > 9) {
      route.push(point);
      this.drawRoute();
      const check = validatePlan(route, this.level.walls, this.level.loot, this.level.exit, 32);
      if (check.crossesWall) setMessage(check.reason, "bad");
      else if (check.collectsLoot && check.reachesExit) setMessage(check.reason, "good");
    }
  }

  private pointerPoint(pointer: Phaser.Input.Pointer): Point {
    return { x: Phaser.Math.Clamp(pointer.worldX, 0, WIDTH), y: Phaser.Math.Clamp(pointer.worldY, 0, HEIGHT) };
  }

  private drawMap(): void {
    const { walls, start, loot, exit, accent } = this.level;
    this.mapGraphics.fillStyle(0x111b2b);
    this.mapGraphics.fillRect(0, 0, WIDTH, HEIGHT);
    this.mapGraphics.lineStyle(1, 0x223149, 0.75);
    for (let x = 0; x <= WIDTH; x += 40) this.mapGraphics.lineBetween(x, 0, x, HEIGHT);
    for (let y = 0; y <= HEIGHT; y += 40) this.mapGraphics.lineBetween(0, y, WIDTH, y);
    walls.forEach((wall) => {
      this.mapGraphics.fillStyle(0x2b3c58);
      this.mapGraphics.fillRoundedRect(wall.x, wall.y, wall.width, wall.height, 7);
      this.mapGraphics.lineStyle(2, 0x405572, 0.8);
      this.mapGraphics.strokeRoundedRect(wall.x, wall.y, wall.width, wall.height, 7);
      this.mapGraphics.lineStyle(1, 0x18253a, 0.6);
      for (let y = wall.y + 9; y < wall.y + wall.height; y += 12) this.mapGraphics.lineBetween(wall.x + 4, y, wall.x + wall.width - 4, y);
    });
    this.marker(start, 0x5be3ae, "SAFEHOUSE", "⌂");
    this.marker(loot, 0xffc85a, "BAG", "◆");
    this.marker(exit, accent, "EXIT", "↗");
    this.guardPosition = { ...this.level.patrol[0] };
    this.guard = this.add.container(this.guardPosition.x, this.guardPosition.y).setDepth(6);
    this.guard.add(this.add.circle(0, 0, 14, 0xff5f7b).setStrokeStyle(3, 0xffb0be));
    this.guard.add(this.add.circle(0, 0, 5, 0x421928));
    this.guard.add(this.add.text(-22, 22, "WATCH", { fontFamily: "Arial", fontSize: "10px", color: "#ff9caf", fontStyle: "bold" }));
    this.actor = this.add.container(start.x, start.y).setName("actor").setDepth(7).setVisible(false);
    this.actor.add(this.add.circle(0, 0, 10, 0x9b83ff).setStrokeStyle(3, 0xe2dfff));
    this.actor.add(this.add.circle(0, 0, 3, 0xffffff));
    this.drawVision();
  }

  private marker(point: Point, color: number, label: string, icon: string): void {
    const pulse = this.add.circle(point.x, point.y, 27, color, 0.09).setDepth(1);
    this.tweens.add({ targets: pulse, scale: 1.25, alpha: 0.02, duration: 1100, repeat: -1, yoyo: true });
    this.add.circle(point.x, point.y, 18, color, 0.22).setStrokeStyle(2, color).setDepth(3);
    this.add.text(point.x - 7, point.y - 10, icon, { fontFamily: "Arial", fontSize: "18px", color: `#${color.toString(16).padStart(6, "0")}`, fontStyle: "bold" }).setDepth(4);
    this.add.text(point.x - label.length * 3.4, point.y + 27, label, { fontFamily: "Arial", fontSize: "10px", color: `#${color.toString(16).padStart(6, "0")}`, fontStyle: "bold" }).setDepth(4);
  }

  private drawRoute(): void {
    this.routeGraphics.clear();
    if (route.length < 2) return;
    this.routeGraphics.lineStyle(13, 0x0a0e18, 0.55);
    this.routeGraphics.beginPath();
    this.routeGraphics.moveTo(route[0].x, route[0].y);
    route.slice(1).forEach((point) => this.routeGraphics.lineTo(point.x, point.y));
    this.routeGraphics.strokePath();
    this.routeGraphics.lineStyle(7, 0x9b83ff, 0.95);
    this.routeGraphics.beginPath();
    this.routeGraphics.moveTo(route[0].x, route[0].y);
    route.slice(1).forEach((point) => this.routeGraphics.lineTo(point.x, point.y));
    this.routeGraphics.strokePath();
  }

  private moveGuard(time: number): void {
    const points = this.level.patrol;
    const tick = (time % (this.level.guardSpeed * points.length)) / this.level.guardSpeed;
    const segment = Math.floor(tick) % points.length;
    const progress = tick - Math.floor(tick);
    const from = points[segment];
    const to = points[(segment + 1) % points.length];
    this.guardPosition = { x: Phaser.Math.Linear(from.x, to.x, progress), y: Phaser.Math.Linear(from.y, to.y, progress) };
    this.guard.setPosition(this.guardPosition.x, this.guardPosition.y);
    this.drawVision();
  }

  private drawVision(): void {
    this.visionGraphics.clear();
    this.visionGraphics.fillStyle(0xff5f7b, 0.14);
    this.visionGraphics.beginPath();
    this.visionGraphics.moveTo(this.guardPosition.x, this.guardPosition.y);
    this.visionGraphics.arc(this.guardPosition.x, this.guardPosition.y, this.level.guardRange, -0.7, 0.7, false);
    this.visionGraphics.closePath();
    this.visionGraphics.fillPath();
    this.visionGraphics.lineStyle(1, 0xff8095, 0.32);
    this.visionGraphics.strokePath();
  }

  private detected(point: Point): boolean {
    const dx = point.x - this.guardPosition.x;
    const dy = point.y - this.guardPosition.y;
    return Math.hypot(dx, dy) < this.level.guardRange * 0.46;
  }

  clearRoute(): void { if (status === "planning") { route = []; this.drawRoute(); setMessage("Route cleared. Start at the green safehouse."); } }
  undoRoute(): void {
    if (status === "planning" && route.length > 1) {
      route.splice(Math.max(1, route.length - 18));
      this.drawRoute();
      setMessage("Last move undone. Keep the line connected.");
    }
  }
  getPlan(): Point[] { return route; }
  showActor(): void { this.actor.setVisible(true); }
}

function finish(won: boolean, copy: string, title: string): void {
  status = won ? "won" : "lost";
  setPlanState(won ? "good" : "bad");
  setMessage(copy, won ? "good" : "bad");
  localStorage.setItem("heist-level", String(won ? Math.min(levelIndex + 1, LEVELS.length - 1) : levelIndex));
  showOverlay(won, title, copy);
}

function runPlan(): void {
  if (status !== "planning") return;
  const level = LEVELS[levelIndex];
  const check = validatePlan(route, level.walls, level.loot, level.exit, 32);
  if (!check.valid) { setMessage(check.reason, "bad"); showToast(check.reason); return; }
  status = "running";
  planDuration = Math.max(2.4, Math.min(10, route.length / 16));
  startedAt = scene.time.now;
  setPlanState("running");
  scene.showActor();
  setMessage("Executing. Watch the purple runner.", "good");
}

function reset(): void {
  document.querySelector<HTMLButtonElement>("#run-button")!.disabled = false;
  document.querySelector<HTMLButtonElement>("#retry-button")!.disabled = false;
  scene.resetDrawing();
}

function nextLevel(): void {
  levelIndex = Math.min(levelIndex + 1, LEVELS.length - 1);
  localStorage.setItem("heist-level", String(levelIndex));
  reset();
}

function setMessage(message: string, tone: "normal" | "good" | "bad" = "normal"): void {
  $("#message").textContent = message;
  $("#status-dot").className = `status-dot ${tone === "normal" ? "" : tone}`;
}
function setPlanState(state: "planning" | "running" | "good" | "bad"): void {
  document.querySelectorAll(".step").forEach((step, index) => step.classList.toggle("active", (state === "planning" && index === 0) || (state === "running" && index === 1) || ((state === "good" || state === "bad") && index === 2)));
  $("#run-button").toggleAttribute("disabled", state !== "planning");
  $("#retry-button").toggleAttribute("disabled", state === "running");
}
function updateTimer(seconds: number, total: number): void {
  const timer = $("#timer");
  timer.textContent = `${seconds.toFixed(1)}s`;
  timer.style.color = seconds < total * 0.25 ? "#ff6b87" : "";
}
function setLevelText(level: Level): void {
  $("#level-label").textContent = `${String(levelIndex + 1).padStart(2, "0")} / ${String(LEVELS.length).padStart(2, "0")}`;
  $("#mission-title").textContent = `${level.name} — ${level.subtitle}`;
  updateTimer(level.time, level.time);
}
function showToast(message: string): void {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.add("show");
  window.setTimeout(() => toast.classList.remove("show"), 2200);
}
function showOverlay(won: boolean, title: string, copy: string): void {
  $("#result-overlay").hidden = false;
  $("#result-icon").textContent = won ? "✦" : "!";
  $("#result-kicker").textContent = won ? "MISSION COMPLETE" : "MISSION FAILED";
  $("#result-title").textContent = title;
  $("#result-copy").textContent = copy;
  $("#result-primary").textContent = won && levelIndex < LEVELS.length - 1 ? "Next mission" : "Play again";
}
function hideOverlay(): void { $("#result-overlay").hidden = true; }

$("#run-button").addEventListener("click", runPlan);
$("#retry-button").addEventListener("click", reset);
$("#clear-button").addEventListener("click", () => scene.clearRoute());
$("#undo-button").addEventListener("click", () => scene.undoRoute());
$("#result-secondary").addEventListener("click", reset);
$("#result-primary").addEventListener("click", () => { if (status === "won" && levelIndex < LEVELS.length - 1) nextLevel(); else reset(); });
$("#sound-toggle").addEventListener("click", (event) => {
  soundOn = !soundOn;
  const button = event.currentTarget as HTMLButtonElement;
  button.textContent = soundOn ? "🔊" : "🔇";
  button.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
});

scene = new HeistScene();
new Phaser.Game({ type: Phaser.AUTO, parent: "game", width: WIDTH, height: HEIGHT, scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, scene });
