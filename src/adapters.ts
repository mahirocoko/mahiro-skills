import { join } from "path";

import type { InstallScope, ScopedAgent, SupportedAgent } from "./types";

export function isImplementedAgent(agent: ScopedAgent): agent is SupportedAgent {
  return agent === "opencode" || agent === "claude-code" || agent === "cursor" || agent === "gemini";
}

export function resolveRoot(agent: ScopedAgent, scope: InstallScope, env = process.env): string {
  const cwd = env.MAHIRO_SKILLS_CWD || process.cwd();
  const home = env.MAHIRO_SKILLS_HOME || env.HOME;

  if (!isImplementedAgent(agent)) {
    throw new Error(`Agent '${agent}' is modeled in the spec but not implemented in v0.`);
  }

  if (scope === "local") {
    if (agent === "opencode") {
      return join(cwd, ".opencode");
    }

    if (agent === "claude-code") {
      return join(cwd, ".claude");
    }

    if (agent === "cursor") {
      return join(cwd, ".cursor");
    }

    return join(cwd, ".gemini");
  }

  if (!home) {
    throw new Error("Unable to resolve HOME for global installation scope.");
  }

  if (agent === "opencode") {
    return join(home, ".config", "opencode");
  }

  if (agent === "claude-code") {
    return join(home, ".claude");
  }

  if (agent === "cursor") {
    return join(home, ".cursor");
  }

  return join(home, ".gemini");
}

export function supportsCommands(agent: ScopedAgent): boolean {
  return isImplementedAgent(agent);
}
