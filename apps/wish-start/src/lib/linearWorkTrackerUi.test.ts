import { describe, expect, it } from "vite-plus/test";

import { getInitialLinearTeamId, parseLinearCallbackResult } from "./linearWorkTrackerUi";

describe("Linear Work Tracker UI", () => {
  it("selects only an accessible current team or a sole alternative", () => {
    expect(getInitialLinearTeamId([], "missing")).toBe("");
    expect(getInitialLinearTeamId([{ id: "new" }], "missing")).toBe("new");
    expect(getInitialLinearTeamId([{ id: "one" }, { id: "two" }], "missing")).toBe("");
    expect(getInitialLinearTeamId([{ id: "one" }, { id: "two" }], "two")).toBe("two");
  });

  it("accepts only known callback results", () => {
    expect(parseLinearCallbackResult("authorized")).toBe("authorized");
    expect(parseLinearCallbackResult("toString")).toBeUndefined();
    expect(parseLinearCallbackResult("__proto__")).toBeUndefined();
  });
});
