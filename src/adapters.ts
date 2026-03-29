import { join } from "path";

import type { InstallScope, ScopedAgent, SupportedAgent } from "./types";

export function isImplementedAgent(agent: ScopedAgent): agent is SupportedAgent {
  return agent === "opencode" || agent === "claude-code";
}

export function resolveRoot(agent: ScopedAgent, scope: InstallScope, env = process.env): string {
  const cwd = env.MAHIRO_SKILLS_CWD || process.cwd();
  const home = env.MAHIRO_SKILLS_HOME || env.HOME;

  if (!isImplementedAgent(agent)) {
    throw new Error(`Agent '${agent}' is modeled in the spec but not implemented in v0.`);
  }

  if (scope === "local") {
    return join(cwd, agent === "opencode" ? ".opencode" : ".claude");
  }

  if (!home) {
    throw new Error("Unable to resolve HOME for global installation scope.");
  }

  if (agent === "opencode") {
    return join(home, ".config", "opencode");
  }

  return join(home, ".claude");
}

export function supportsCommands(agent: ScopedAgent): boolean {
  return isImplementedAgent(agent);
}
