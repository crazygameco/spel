export type Point = { x: number; y: number };
export type Rect = { x: number; y: number; width: number; height: number };
export type Outcome = "playing" | "won" | "lost";

const EPSILON = 0.0001;

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function routeCrossesWall(route: Point[], walls: Rect[]): boolean {
  for (let index = 1; index < route.length; index += 1) {
    const from = route[index - 1];
    const to = route[index];
    if (walls.some((wall) => segmentIntersectsRect(from, to, wall))) return true;
  }
  return false;
}

export function routeVisitsPoint(route: Point[], target: Point, radius: number): boolean {
  return route.some((point) => distance(point, target) <= radius);
}

export function evaluatePlan(route: Point[], walls: Rect[], loot: Point, exit: Point, proximity: number): boolean {
  return route.length > 1 &&
    !routeCrossesWall(route, walls) &&
    routeVisitsPoint(route, loot, proximity) &&
    routeVisitsPoint(route, exit, proximity);
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

