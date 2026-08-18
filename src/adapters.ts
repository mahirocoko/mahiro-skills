import { join } from "path";

import { supportedAgents, type InstallScope, type ScopedAgent, type SupportedAgent } from "./types";

export interface CommandArtifact {
  extension: ".md" | ".toml";
  sourceRelativePath: string;
  targetRelativePath: string;
}

export interface SkillArtifact {
  targetRelativePath: string;
}

export function isImplementedAgent(agent: ScopedAgent): agent is SupportedAgent {
  return supportedAgents.includes(agent);
}

function resolvePiAgentDir(configuredRoot: string, home: string | undefined): string {
  if (configuredRoot === "~" || configuredRoot.startsWith("~/")) {
    if (!home) {
      throw new Error("Unable to expand PI_CODING_AGENT_DIR without HOME.");
    }

    return configuredRoot === "~" ? home : join(home, configuredRoot.slice(2));
  }

  return configuredRoot;
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

    if (agent === "codex") {
      return join(cwd, ".codex");
    }

    if (agent === "letta-code") {
      return join(cwd, ".agents");
    }

    if (agent === "agy") {
      return join(cwd, ".agents");
    }

    if (agent === "pi") {
      return join(cwd, ".pi");
    }

    throw new Error(`Unable to resolve local root for agent '${agent}'.`);
  }

  if (agent === "pi" && env.PI_CODING_AGENT_DIR) {
    return resolvePiAgentDir(env.PI_CODING_AGENT_DIR, home);
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

  if (agent === "codex") {
    return join(home, ".codex");
  }

  if (agent === "letta-code") {
    return join(home, ".letta");
  }

  if (agent === "agy") {
    return join(home, ".gemini", "config");
  }

  if (agent === "pi") {
    return join(home, ".pi", "agent");
  }

  throw new Error(`Unable to resolve global root for agent '${agent}'.`);
}

export function supportsCommands(agent: ScopedAgent): boolean {
  return isImplementedAgent(agent) && agent !== "agy" && agent !== "letta-code" && agent !== "pi";
}

export function resolveSkillArtifact(agent: ScopedAgent, name: string): SkillArtifact {
  return {
    targetRelativePath: join("skills", agent === "agy" ? `mh-${name}` : name),
  };
}

export function resolveCommandArtifact(agent: ScopedAgent, name: string): CommandArtifact {
  return {
    extension: ".md",
    sourceRelativePath: join("commands", `${name}.md`),
    targetRelativePath: join("commands", `${name}.md`),
  };
}
