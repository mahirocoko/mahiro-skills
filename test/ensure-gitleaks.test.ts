import { describe, expect, test } from "bun:test";
import { join } from "path";

describe("ensure-gitleaks", () => {
  test("covers pinned repair cases without network", () => {
    const script = join(import.meta.dir, "ensure-gitleaks-cases.py");
    const result = Bun.spawnSync({
      cmd: ["python3", script],
      stdout: "pipe",
      stderr: "pipe",
    });
    const stdout = new TextDecoder().decode(result.stdout);
    const stderr = new TextDecoder().decode(result.stderr);
    expect(stderr, stdout).toBe("");
    expect(result.exitCode, `${stdout}\n${stderr}`).toBe(0);
    expect(stdout.trim()).toBe('{"ok": true}');
  });
});
