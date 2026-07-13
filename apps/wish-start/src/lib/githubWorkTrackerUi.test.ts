import { describe, expect, it } from "vite-plus/test";

import {
  getInitialGitHubRepositoryId,
  parseGitHubCallbackResult,
} from "./githubWorkTrackerUi";

describe("GitHub Work Tracker UI", () => {
  it("selects only an unambiguous repository", () => {
    expect(getInitialGitHubRepositoryId([], "missing")).toBe("");
    expect(getInitialGitHubRepositoryId([{ id: "new" }], "missing")).toBe("new");
    expect(
      getInitialGitHubRepositoryId([{ id: "one" }, { id: "two" }], "missing"),
    ).toBe("");
    expect(
      getInitialGitHubRepositoryId([{ id: "one" }, { id: "two" }], "two"),
    ).toBe("two");
  });

  it("accepts only known callback results", () => {
    expect(parseGitHubCallbackResult("authorized")).toBe("authorized");
    expect(parseGitHubCallbackResult("toString")).toBeUndefined();
    expect(parseGitHubCallbackResult("__proto__")).toBeUndefined();
  });
});
