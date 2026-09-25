import { describe, expect, it } from "vitest";
import { evaluatePlan, routeCrossesWall, type Point, type Rect } from "../src/game/logic";

const wall: Rect = { x: 40, y: 0, width: 20, height: 100 };
const loot: Point = { x: 80, y: 50 };
const exit: Point = { x: 120, y: 50 };

describe("heist route rules", () => {
  it("detects a route crossing a wall", () => {
    expect(routeCrossesWall([{ x: 0, y: 50 }, { x: 100, y: 50 }], [wall])).toBe(true);
  });

  it("accepts a route that visits loot and exit without crossing walls", () => {
    expect(evaluatePlan([{ x: 0, y: 120 }, { x: 80, y: 120 }, loot, exit], [wall], loot, exit, 5)).toBe(true);
  });

  it("rejects a route that misses the loot", () => {
    expect(evaluatePlan([{ x: 0, y: 120 }, exit], [wall], loot, exit, 5)).toBe(false);
  });

  it("restarts deterministically from planning state", () => {
    const route = [{ x: 0, y: 120 }, loot, exit];
    expect(evaluatePlan(route, [wall], loot, exit, 5)).toBe(true);
    expect(evaluatePlan(route, [wall], loot, exit, 5)).toBe(true);
  });
});
