import { existsSync, realpathSync } from "fs";

export function findStandalonePython() {
  const candidates = [
    "/usr/bin/python3",
    "/opt/homebrew/bin/python3",
    "/usr/local/bin/python3",
    Bun.which("python3"),
  ].filter((candidate): candidate is string => Boolean(candidate));

  for (const candidate of [...new Set(candidates)]) {
    if (!existsSync(candidate)) {
      continue;
    }
    const resolved = realpathSync(candidate);
    const result = Bun.spawnSync({
      cmd: [resolved, "-c", "import json, subprocess, sys"],
      env: { PATH: "/usr/bin:/bin:/usr/sbin:/sbin" },
      stderr: "ignore",
      stdout: "ignore",
    });
    if (result.exitCode === 0) {
      return resolved;
    }
  }

  throw new Error("tests require a standalone python3 executable");
}
