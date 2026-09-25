export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type Outcome = "playing" | "won" | "lost";
export type PatrolState = {
  segment: number;
  progress: number;
  position: Point;
  heading: number;
};

export function canUseStun(charges: number, nowMs: number, cooldownUntilMs: number): boolean {
  return charges > 0 && nowMs >= cooldownUntilMs;
}
export type PlanCheck = {
  valid: boolean;
  crossesWall: boolean;
  collectsLoot: boolean;
  reachesExit: boolean;
  reason: string;
};

const EPSILON = 0.0001;

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function pointInRect(point: Point, rect: Rect, clearance = 0): boolean {
  return point.x >= rect.x - clearance &&
    point.x <= rect.x + rect.width + clearance &&
    point.y >= rect.y - clearance &&
    point.y <= rect.y + rect.height + clearance;
}

export function routeCrossesWall(route: Point[], walls: Rect[]): boolean {
  return routeSegmentCrossesWall(route, walls);
}

export function routeSegmentCrossesWall(route: Point[], walls: Rect[], clearance = 0): boolean {
  for (let index = 1; index < route.length; index += 1) {
    if (segmentCrossesWall(route[index - 1], route[index], walls, clearance)) return true;
  }
  return false;
}

export function segmentCrossesWall(from: Point, to: Point, walls: Rect[], clearance = 0): boolean {
  return walls.some((wall) => segmentIntersectsRect(from, to, expandRect(wall, clearance)));
}

export function getPatrolState(timeMs: number, patrol: Point[], segmentDurationMs: number): PatrolState {
  const safeDuration = Math.max(1, segmentDurationMs);
  const tick = (Math.max(0, timeMs) % (safeDuration * patrol.length)) / safeDuration;
  const segment = Math.floor(tick) % patrol.length;
  const progress = tick - Math.floor(tick);
  const from = patrol[segment];
  const to = patrol[(segment + 1) % patrol.length];
  return {
    segment,
    progress,
    position: { x: from.x + (to.x - from.x) * progress, y: from.y + (to.y - from.y) * progress },
    heading: Math.atan2(to.y - from.y, to.x - from.x)
  };
}

export function routeVisitsPoint(route: Point[], target: Point, radius: number): boolean {
  return route.some((point) => distance(point, target) <= radius);
}

export function evaluatePlan(route: Point[], walls: Rect[], loot: Point, exit: Point, proximity: number): boolean {
  return validatePlan(route, walls, loot, exit, proximity).valid;
}

export function validatePlan(route: Point[], walls: Rect[], loot: Point, exit: Point, proximity: number): PlanCheck {
  const crossesWall = route.length > 1 && routeSegmentCrossesWall(route, walls, 11);
  const collectsLoot = routeVisitsPoint(route, loot, proximity);
  const reachesExit = routeVisitsPoint(route, exit, proximity);
  const valid = route.length > 1 && !crossesWall && collectsLoot && reachesExit;
  const reason = route.length < 2
    ? "Start drawing from the green safehouse."
    : crossesWall
      ? "That line clips a wall. Try a different angle."
      : !collectsLoot
        ? "The bag is still inside. Pass through the gold marker."
        : !reachesExit
          ? "You need to finish at the blue exit."
          : "Plan ready. Make it count.";
  return { valid, crossesWall, collectsLoot, reachesExit, reason };
}

function segmentIntersectsRect(from: Point, to: Point, rect: Rect): boolean {
  const minX = rect.x;
  const maxX = rect.x + rect.width;
  const minY = rect.y;
  const maxY = rect.y + rect.height;
  if (inside(from, rect) || inside(to, rect)) return true;
  return lineIntersects(from, to, { x: minX, y: minY }, { x: maxX, y: minY }) ||
    lineIntersects(from, to, { x: maxX, y: minY }, { x: maxX, y: maxY }) ||
    lineIntersects(from, to, { x: maxX, y: maxY }, { x: minX, y: maxY }) ||
    lineIntersects(from, to, { x: minX, y: maxY }, { x: minX, y: minY });
}

function expandRect(rect: Rect, amount: number): Rect {
  return { x: rect.x - amount, y: rect.y - amount, width: rect.width + amount * 2, height: rect.height + amount * 2 };
}

function inside(point: Point, rect: Rect): boolean {
  return point.x > rect.x + EPSILON && point.x < rect.x + rect.width - EPSILON &&
    point.y > rect.y + EPSILON && point.y < rect.y + rect.height - EPSILON;
}

function lineIntersects(a: Point, b: Point, c: Point, d: Point): boolean {
  const cross = (p: Point, q: Point, r: Point) => (q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x);
  const abC = cross(a, b, c);
  const abD = cross(a, b, d);
  const cdA = cross(c, d, a);
  const cdB = cross(c, d, b);
  return (abC * abD < 0 && cdA * cdB < 0) ||
    Math.abs(abC) < EPSILON && onSegment(a, b, c) ||
    Math.abs(abD) < EPSILON && onSegment(a, b, d) ||
    Math.abs(cdA) < EPSILON && onSegment(c, d, a) ||
    Math.abs(cdB) < EPSILON && onSegment(c, d, b);
}

function onSegment(a: Point, b: Point, p: Point): boolean {
  return p.x >= Math.min(a.x, b.x) - EPSILON && p.x <= Math.max(a.x, b.x) + EPSILON &&
    p.y >= Math.min(a.y, b.y) - EPSILON && p.y <= Math.max(a.y, b.y) + EPSILON;
}
