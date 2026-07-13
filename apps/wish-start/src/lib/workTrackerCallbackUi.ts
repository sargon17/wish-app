import { parseGitHubCallbackResult } from "./githubWorkTrackerUi";
import { parseLinearCallbackResult } from "./linearWorkTrackerUi";

const linearMessages = {
  authorized: {
    title: "Linear authorized",
    description: "Choose the team that should receive new External Work Items.",
  },
  invalid_callback: {
    title: "Linear did not complete authorization",
    description: "Start the connection again from Work Tracker settings.",
  },
  invalid_state: {
    title: "This Linear connection link expired",
    description: "OAuth links are single-use and expire after ten minutes. Start again.",
  },
  authorization_denied: {
    title: "Linear authorization was canceled",
    description: "No active connection was changed.",
  },
  linear_exchange_failed: {
    title: "Linear rejected the authorization exchange",
    description: "No active connection was changed. Start again or check the Linear app settings.",
  },
  linear_discovery_failed: {
    title: "Wish could not load Linear teams",
    description: "No active connection was changed. Reauthorize and try again.",
  },
  linear_persistence_failed: {
    title: "Wish could not save the Linear authorization",
    description: "The new authorization was revoked. Start again.",
  },
};

const githubMessages = {
  authorized: {
    title: "GitHub authorized",
    description: "Choose the repository that should receive new External Work Items.",
  },
  invalid_callback: {
    title: "GitHub did not complete authorization",
    description: "Start the connection again from Work Tracker settings.",
  },
  invalid_state: {
    title: "This GitHub connection link expired",
    description: "Installation links are single-use and expire after ten minutes. Start again.",
  },
  authorization_denied: {
    title: "GitHub authorization was canceled",
    description: "No active connection was changed.",
  },
  github_exchange_failed: {
    title: "GitHub rejected the authorization exchange",
    description: "No active connection was changed. Start the installation again.",
  },
  github_discovery_failed: {
    title: "Wish could not load GitHub repositories",
    description: "No active connection was changed. Check the installation and try again.",
  },
  github_revocation_failed: {
    title: "GitHub credential cleanup is still running",
    description: "No connection was changed. Wish will keep revoking the temporary credentials.",
  },
  github_persistence_failed: {
    title: "Wish could not save the GitHub authorization",
    description: "The temporary credentials were revoked. Start again.",
  },
};

export function getWorkTrackerCallbackMessage(
  provider: "github" | "linear",
  value?: string | null,
) {
  switch (provider) {
    case "github": {
      const result = parseGitHubCallbackResult(value);
      return result ? { ...githubMessages[result], successful: result === "authorized" } : null;
    }
    case "linear": {
      const result = parseLinearCallbackResult(value);
      return result ? { ...linearMessages[result], successful: result === "authorized" } : null;
    }
  }
}

export function getWorkTrackerCallbackDismissUrl(
  pathname: string,
  searchString: string,
  provider: "github" | "linear",
) {
  const search = new URLSearchParams(searchString);
  search.delete(provider);
  if (!search.has("github") && !search.has("linear")) search.delete("settings");
  const suffix = search.toString();
  return `${pathname}${suffix ? `?${suffix}` : ""}`;
}
