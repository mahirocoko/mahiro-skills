export const packagedSkillDependencies: Readonly<Record<string, readonly string[]>> = {
  "cocoindex-rules-init": ["ccc"],
};

export function packagedDependents(skillName: string): string[] {
  return Object.entries(packagedSkillDependencies)
    .filter(([, dependencies]) => dependencies.includes(skillName))
    .map(([name]) => name);
}
