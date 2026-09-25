import Phaser from "phaser";
import { evaluatePlan, type Point, type Rect } from "./game/logic";
import "./style.css";

const WIDTH = 960;
const HEIGHT = 600;
const START: Point = { x: 92, y: 510 };
const LOOT: Point = { x: 480, y: 112 };
const EXIT: Point = { x: 866, y: 92 };
const WALLS: Rect[] = [
  { x: 205, y: 0, width: 42, height: 390 },
  { x: 205, y: 475, width: 42, height: 125 },
  { x: 420, y: 160, width: 42, height: 440 },
  { x: 640, y: 0, width: 42, height: 340 },
  { x: 780, y: 260, width: 42, height: 340 }
];
const PATROL = [
  { x: 300, y: 120 }, { x: 570, y: 120 }, { x: 570, y: 430 }, { x: 300, y: 430 }
];

type GameStatus = "planning" | "running" | "won" | "lost";
let status: GameStatus = "planning";
let route: Point[] = [];
let soundOn = true;
let scene: HeistScene;
let startedAt = 0;

class HeistScene extends Phaser.Scene {
  private routeGraphics!: Phaser.GameObjects.Graphics;
  private guard!: Phaser.GameObjects.Arc;
  private vision!: Phaser.GameObjects.Graphics;
  private drawing = false;
  private guardPosition = PATROL[0];

  constructor() { super("heist"); }

  create(): void {
    this.cameras.main.setBackgroundColor("#101724");
    this.routeGraphics = this.add.graphics();
    this.vision = this.add.graphics();
    this.drawMap();
    this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => this.beginRoute(pointer));
    this.input.on("pointermove", (pointer: Phaser.Input.Pointer) => this.extendRoute(pointer));
    this.input.on("pointerup", () => { this.drawing = false; });
  }

  update(time: number): void {
    if (status !== "running") return;
    const elapsed = (time - startedAt) / 1000;
    updateTimer(Math.max(0, 30 - elapsed));
    this.moveGuard(time);
    const routeIndex = Math.min(route.length - 1, Math.floor(elapsed * 8));
    const actor = route[Math.max(0, routeIndex)];
    if (elapsed >= 30) finish(false, "Time's up — the crew got away. Try again.");
    else if (actor && Phaser.Math.Distance.Between(actor.x, actor.y, this.guardPosition.x, this.guardPosition.y) < 48) finish(false, "Spotted! Draw a safer route.");
    else if (elapsed >= route.length / 8) finish(true, "Clean getaway! You made it out.");
  }

  resetDrawing(): void {
    route = [];
    status = "planning";
    this.scene.restart();
    updateTimer(30);
  }

  private beginRoute(pointer: Phaser.Input.Pointer): void {
    if (status !== "planning") return;
    const point = this.scalePoint(pointer);
    if (Phaser.Math.Distance.Between(point.x, point.y, START.x, START.y) > 42) return;
    this.drawing = true;
    route = [START];
    this.drawRoute();
    setMessage("Keep drawing through the loot to the exit.");
  }

  private extendRoute(pointer: Phaser.Input.Pointer): void {
    if (!this.drawing || status !== "planning") return;
    const point = this.scalePoint(pointer);
    const last = route[route.length - 1];
    if (Phaser.Math.Distance.Between(point.x, point.y, last.x, last.y) > 8) {
      route.push(point);
      this.drawRoute();
    }
  }

  private scalePoint(pointer: Phaser.Input.Pointer): Point {
    return { x: pointer.worldX, y: pointer.worldY };
  }

  private drawMap(): void {
    const graphics = this.add.graphics();
    graphics.fillStyle(0x151f31);
    graphics.fillRect(0, 0, WIDTH, HEIGHT);
    graphics.lineStyle(2, 0x253650);
    for (let x = 0; x < WIDTH; x += 40) graphics.lineBetween(x, 0, x, HEIGHT);
    for (let y = 0; y < HEIGHT; y += 40) graphics.lineBetween(0, y, WIDTH, y);
    WALLS.forEach((wall) => {
      graphics.fillStyle(0x31415c);
      graphics.fillRoundedRect(wall.x, wall.y, wall.width, wall.height, 6);
    });
    this.add.circle(START.x, START.y, 22, 0x50d890).setStrokeStyle(3, 0xb8ffdc);
    this.add.circle(LOOT.x, LOOT.y, 22, 0xffca64).setStrokeStyle(3, 0xfff0bd);
    this.add.circle(EXIT.x, EXIT.y, 22, 0x66b5ff).setStrokeStyle(3, 0xc9e5ff);
    this.add.text(START.x - 29, START.y + 30, "START", { fontSize: "14px", color: "#b8ffdc", fontStyle: "bold" });
    this.add.text(LOOT.x - 22, LOOT.y - 45, "LOOT", { fontSize: "14px", color: "#fff0bd", fontStyle: "bold" });
    this.add.text(EXIT.x - 24, EXIT.y - 45, "EXIT", { fontSize: "14px", color: "#c9e5ff", fontStyle: "bold" });
    this.guard = this.add.circle(this.guardPosition.x, this.guardPosition.y, 13, 0xff627c).setDepth(3);
    this.add.text(this.guardPosition.x - 22, this.guardPosition.y + 19, "GUARD", { fontSize: "11px", color: "#ff9aae" }).setDepth(3);
    this.drawVision();
  }

  private drawRoute(): void {
    this.routeGraphics.clear();
    if (route.length < 2) return;
    this.routeGraphics.lineStyle(7, 0x8d7aff, 0.9);
    this.routeGraphics.beginPath();
    this.routeGraphics.moveTo(route[0].x, route[0].y);
    route.slice(1).forEach((point) => this.routeGraphics.lineTo(point.x, point.y));
    this.routeGraphics.strokePath();
  }

  private moveGuard(time: number): void {
    const segment = Math.floor((time / 1600) % PATROL.length);
    const next = PATROL[(segment + 1) % PATROL.length];
    const progress = (time % 1600) / 1600;
    this.guardPosition = { x: Phaser.Math.Linear(PATROL[segment].x, next.x, progress), y: Phaser.Math.Linear(PATROL[segment].y, next.y, progress) };
    this.guard.setPosition(this.guardPosition.x, this.guardPosition.y);
    this.drawVision();
  }

  private drawVision(): void {
    this.vision.clear();
    this.vision.fillStyle(0xff627c, 0.13);
    this.vision.beginPath();
    this.vision.moveTo(this.guardPosition.x, this.guardPosition.y);
    this.vision.arc(this.guardPosition.x, this.guardPosition.y, 125, -0.45, 0.45, false);
    this.vision.closePath();
    this.vision.fillPath();
  }
}

function finish(won: boolean, message: string): void {
  status = won ? "won" : "lost";
  setMessage(message);
  document.querySelector<HTMLButtonElement>("#run-button")!.disabled = true;
  document.querySelector<HTMLButtonElement>("#retry-button")!.textContent = won ? "Play again" : "Change plan";
}

function updateTimer(seconds: number): void {
  document.querySelector("#timer")!.textContent = `${seconds.toFixed(1)}s`;
}

function setMessage(message: string): void {
  document.querySelector("#message")!.textContent = message;
}

function runPlan(): void {
  if (status !== "planning") return;
  const valid = evaluatePlan(route, WALLS, LOOT, EXIT, 30);
  if (!valid) {
    setMessage("That route is blocked or misses the loot/exit. Draw one connected route.");
    return;
  }
  status = "running";
  startedAt = scene.time.now;
  document.querySelector<HTMLButtonElement>("#run-button")!.disabled = true;
  document.querySelector<HTMLButtonElement>("#retry-button")!.disabled = true;
  setMessage("Executing the plan...");
}

function reset(): void {
  document.querySelector<HTMLButtonElement>("#run-button")!.disabled = false;
  document.querySelector<HTMLButtonElement>("#retry-button")!.disabled = false;
  document.querySelector<HTMLButtonElement>("#retry-button")!.textContent = "Change plan";
  scene.resetDrawing();
  setMessage("Draw a route from START to the loot, then to EXIT.");
}

document.querySelector("#run-button")!.addEventListener("click", runPlan);
document.querySelector("#retry-button")!.addEventListener("click", reset);
document.querySelector("#sound-toggle")!.addEventListener("click", (event) => {
  soundOn = !soundOn;
  const button = event.currentTarget as HTMLButtonElement;
  button.textContent = soundOn ? "🔊" : "🔇";
  button.setAttribute("aria-label", soundOn ? "Turn sound off" : "Turn sound on");
});

scene = new HeistScene();
new Phaser.Game({ type: Phaser.AUTO, parent: "game", width: WIDTH, height: HEIGHT, scale: { mode: Phaser.Scale.RESIZE, autoCenter: Phaser.Scale.CENTER_BOTH }, scene });
