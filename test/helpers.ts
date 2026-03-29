import { mkdtempSync, mkdirSync, rmSync } from "fs";
import { tmpdir } from "os";
import { join } from "path";

export function makeTempEnv() {
  const root = mkdtempSync(join(tmpdir(), "mahiro-skills-"));
  const home = join(root, "home");
  const cwd = join(root, "project");

  mkdirSync(home, { recursive: true });
  mkdirSync(cwd, { recursive: true });

  return {
    root,
    env: {
      ...process.env,
      MAHIRO_SKILLS_HOME: home,
      MAHIRO_SKILLS_CWD: cwd,
    },
    cleanup() {
      rmSync(root, { recursive: true, force: true });
    },
  };
}
