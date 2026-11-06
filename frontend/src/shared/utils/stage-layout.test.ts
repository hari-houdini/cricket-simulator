import { describe, expect, it } from "vitest";

import {
  ringPoint,
  stageCameraDistanceFor,
  stageRadiusFor,
} from "./stage-layout";

describe("ringPoint", () => {
  it("places the first franchise at the front of the stage, nearest the viewer", () => {
    const point = ringPoint(0, 10, 3);
    expect(point.angle).toBe(0);
    expect(point.x).toBeCloseTo(0);
    expect(point.z).toBeCloseTo(3);
  });

  it("places the franchise a quarter of the way round on the X axis", () => {
    const point = ringPoint(5, 20, 2);
    expect(point.angle).toBeCloseTo(Math.PI / 2);
    expect(point.x).toBeCloseTo(2);
    expect(point.z).toBeCloseTo(0, 10);
  });

  it("keeps every franchise on the circle of the given radius", () => {
    for (let index = 0; index < 10; index += 1) {
      const point = ringPoint(index, 10, 4);
      expect(Math.hypot(point.x, point.z)).toBeCloseTo(4);
    }
  });

  it("spaces the ten franchises evenly", () => {
    const angles = Array.from(
      { length: 10 },
      (_, index) => ringPoint(index, 10, 1).angle,
    );
    const steps = angles
      .slice(1)
      .map((angle, index) => angle - (angles[index] ?? 0));
    for (const step of steps) {
      expect(step).toBeCloseTo((Math.PI * 2) / 10);
    }
  });

  it("throws when the ring has no franchises", () => {
    expect(() => ringPoint(0, 0, 1)).toThrow(RangeError);
  });

  it("throws for an index below the ring", () => {
    expect(() => ringPoint(-1, 10, 1)).toThrow(RangeError);
  });

  it("throws for an index at or past the end of the ring", () => {
    expect(() => ringPoint(10, 10, 1)).toThrow(RangeError);
  });
});

describe("stageRadiusFor", () => {
  it("uses the tightest ring on a phone", () => {
    expect(stageRadiusFor(375)).toBe(2.1);
  });

  it("uses the middle ring on a large phone or small tablet", () => {
    expect(stageRadiusFor(600)).toBe(2.6);
  });

  it("opens the ring up from the tablet breakpoint", () => {
    expect(stageRadiusFor(1024)).toBe(3);
  });
});

describe("stageCameraDistanceFor", () => {
  it("pulls the camera furthest back on a phone", () => {
    expect(stageCameraDistanceFor(375)).toBe(10.5);
  });

  it("uses the middle distance on a large phone or small tablet", () => {
    expect(stageCameraDistanceFor(600)).toBe(9.4);
  });

  it("brings the camera closest from the tablet breakpoint", () => {
    expect(stageCameraDistanceFor(1280)).toBe(8.6);
  });
});
