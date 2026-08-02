import { createHash } from "crypto";
import { existsSync, lstatSync, readFileSync, readdirSync, readlinkSync } from "fs";
import { join, relative } from "path";

function updateString(hash: ReturnType<typeof createHash>, value: string): void {
  hash.update(value);
  hash.update("\0");
}

export function hashPath(path: string): string | null {
  if (!existsSync(path)) {
    return null;
  }

  const hash = createHash("sha256");

  const visit = (currentPath: string): void => {
    const stats = lstatSync(currentPath);
    const relativePath = relative(path, currentPath) || ".";

    updateString(hash, relativePath);
    updateString(hash, String(stats.mode & 0o777));

    if (stats.isSymbolicLink()) {
      updateString(hash, "symlink");
      updateString(hash, readlinkSync(currentPath));
      return;
    }

    if (stats.isDirectory()) {
      updateString(hash, "directory");
      for (const entry of readdirSync(currentPath).sort()) {
        visit(join(currentPath, entry));
      }
      return;
    }

    if (stats.isFile()) {
      updateString(hash, "file");
      hash.update(readFileSync(currentPath));
      hash.update("\0");
      return;
    }

    updateString(hash, "other");
  };

  visit(path);
  return hash.digest("hex");
}
