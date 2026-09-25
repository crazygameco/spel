import { describe, expect, it } from "vitest";
import { evaluatePlan, getPatrolState, pointInRect, routeCrossesWall, segmentCrossesWall, validatePlan, type Point, type Rect } from "../src/game/logic";

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
    const route = [{ x: 0, y: 120 }, { x: 80, y: 120 }, loot, exit];
    expect(evaluatePlan(route, [wall], loot, exit, 5)).toBe(true);
    expect(evaluatePlan(route, [wall], loot, exit, 5)).toBe(true);
  });

  it("returns actionable reasons for an unfinished plan", () => {
    const check = validatePlan([{ x: 0, y: 120 }], [wall], loot, exit, 5);
    expect(check.valid).toBe(false);
    expect(check.reason).toContain("Start drawing");
  });

  it("accepts a valid plan with explicit collection and exit checkpoints", () => {
    const check = validatePlan([{ x: 0, y: 120 }, { x: 80, y: 120 }, loot, exit], [wall], loot, exit, 5);
    expect(check).toMatchObject({ valid: true, crossesWall: false, collectsLoot: true, reachesExit: true });
  });

  it("uses runner clearance when checking a near-wall route", () => {
    expect(segmentCrossesWall({ x: 0, y: 108 }, { x: 100, y: 108 }, [wall], 11)).toBe(true);
    expect(segmentCrossesWall({ x: 0, y: 120 }, { x: 100, y: 120 }, [wall], 11)).toBe(false);
  });

  it("exposes deterministic patrol segment and heading state", () => {
    const state = getPatrolState(1500, [{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], 1000);
    expect(state.segment).toBe(1);
    expect(state.progress).toBeCloseTo(0.5);
    expect(state.position).toEqual({ x: 100, y: 50 });
    expect(state.heading).toBeCloseTo(Math.PI / 2);
  });

  it("blocks the player radius at solid wall edges", () => {
    expect(pointInRect({ x: 28, y: 50 }, wall, 11)).toBe(false);
    expect(pointInRect({ x: 28, y: 50 }, wall, 13)).toBe(true);
  });
});
