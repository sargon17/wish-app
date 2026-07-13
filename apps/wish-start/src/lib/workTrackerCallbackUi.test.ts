import { describe, expect, it } from "vite-plus/test";

import {
  getWorkTrackerCallbackDismissUrl,
  getWorkTrackerCallbackMessage,
} from "./workTrackerCallbackUi";

describe("getWorkTrackerCallbackMessage", () => {
  it("returns dashboard-safe feedback for provider callbacks without a project route", () => {
    expect(getWorkTrackerCallbackMessage("github", "invalid_state")).toEqual({
      title: "This GitHub connection link expired",
      description: "Installation links are single-use and expire after ten minutes. Start again.",
      successful: false,
    });
    expect(getWorkTrackerCallbackMessage("linear", "invalid_callback")).toEqual({
      title: "Linear did not complete authorization",
      description: "Start the connection again from Work Tracker settings.",
      successful: false,
    });
  });

  it("ignores unrecognized callback values", () => {
    expect(getWorkTrackerCallbackMessage("github", "__proto__")).toBeNull();
    expect(getWorkTrackerCallbackMessage("linear", "unknown")).toBeNull();
  });

  it("cleans dashboard callback routing state without dropping unrelated search values", () => {
    expect(
      getWorkTrackerCallbackDismissUrl(
        "/dashboard",
        "?settings=work-trackers&github=invalid_state&tab=mine",
        "github",
      ),
    ).toBe("/dashboard?tab=mine");
    expect(
      getWorkTrackerCallbackDismissUrl(
        "/dashboard",
        "?settings=work-trackers&github=invalid_state&linear=invalid_callback",
        "github",
      ),
    ).toBe("/dashboard?settings=work-trackers&linear=invalid_callback");
  });
});
