/** One policy for packaged skill copy and canonical-source fingerprinting. */
export function includeSkillPayload(relativePath: string, isDirectory: boolean): boolean {
  const parts = relativePath.split(/[\\/]/);
  if (parts.slice(0, -1).includes("__pycache__") || (isDirectory && parts.at(-1) === "__pycache__")) {
    return false;
  }
  return isDirectory || !/\.py[co]$/i.test(parts.at(-1) ?? "");
}
