#!/usr/bin/env bun

import { spawnSync } from 'node:child_process'
import { homedir } from 'node:os'

import { createGlobalSkillTui } from '../src/global-skill-tui'
import { createGlobalSkillManager } from '../src/global-skill-manager'
import { createTerminal } from '../src/terminal'

const usage = `Usage: bun run skills:global [command] [arguments]
  (no command), tui             Open interactive global skills manager
  list                          Inventory global canonical skills and Letta/Agy links (read-only)
  check [name]                  Check one/all GitHub skill-folder hashes (read-only)
  install <owner/repo> <name>   Install globally via official skills CLI, then link Letta and Agy
  adopt <name>                 Verify an existing GitHub install; enable update only
  recover <name> <source-url>  Match an old upstream tree with no lock; enable update only
  link <name>                   Link an existing canonical skill to Letta and Agy (no install)
  update <name>                 Update a manager-installed skill via official CLI
  uninstall <name>              Uninstall a manager-installed skill from its roots
  unlink <name>                 Remove manager-owned Letta and Agy links

No install/update/uninstall is inferred from list or check. Mutations use the
official skills CLI via SKILLS_CLI_BIN or npx --yes skills and require an
explicit command. Test with a disposable HOME before using a live machine.`

const githubGet = async (path: string): Promise<unknown> => {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN
  if (!token) {
    // Reuse the user's existing gh login without copying its credential into
    // our receipt or requiring a token in the TUI launch environment.
    const gh = spawnSync('gh', ['api', `repos/${path}`], {
      encoding: 'utf8', timeout: 12_000, shell: false,
    })
    if (!gh.error && gh.status === 0) return JSON.parse(gh.stdout) as unknown
  }
  const response = await fetch(`https://api.github.com/repos/${path}`, {
    headers: {
      Accept: 'application/vnd.github+json',
      'User-Agent': 'mahiro-global-skill-manager',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal: AbortSignal.timeout(12_000),
  })
  if (!response.ok) throw new Error(`GitHub HTTP ${response.status}`)
  return response.json()
}

const deps = {
  run(args: string[], home: string): void {
    const binary = process.env.SKILLS_CLI_BIN
    const program = binary || 'npx'
    const argv = binary ? args : ['--yes', 'skills', ...args]
    const result = spawnSync(program, argv, {
      cwd: home,
      env: { ...process.env, HOME: home },
      stdio: 'inherit',
      shell: false,
    })
    if (result.error || result.status !== 0) {
      throw new Error(`Official skills CLI failed (${result.error?.message ?? result.status}); inspect the global lock and installed paths before retrying`)
    }
  },
  async tree(ownerRepo: string, ref = 'HEAD') {
    return githubGet(`${ownerRepo}/git/trees/${encodeURIComponent(ref)}?recursive=1`) as Promise<{
      sha: string; truncated?: boolean; tree: Array<{ path: string; type: string; sha: string }>
    }>
  },
  async history(ownerRepo: string, folderPath: string) {
    const commits = await githubGet(`${ownerRepo}/commits?path=${encodeURIComponent(folderPath)}&per_page=20`) as Array<{ sha: string }>
    if (!Array.isArray(commits)) throw new Error('Invalid GitHub commit history')
    return commits.map(({ sha }) => sha)
  },
  async defaultBranch(ownerRepo: string) {
    const repo = await githubGet(ownerRepo) as { default_branch?: string }
    if (typeof repo.default_branch !== 'string') throw new Error('GitHub default branch unavailable')
    return repo.default_branch
  },
}

const failUsage = (): never => { throw new Error(usage) }

const main = async (): Promise<void> => {
  const [command, ...args] = process.argv.slice(2)
  if (command === '--help' || command === 'help') {
    console.log(usage)
    return
  }
  const manager = createGlobalSkillManager(deps, homedir())
  switch (command) {
    case undefined:
    case 'tui':
      if (args.length) failUsage()
      await createGlobalSkillTui(manager, createTerminal()).run()
      break
    case 'list':
      if (args.length) failUsage()
      console.log(JSON.stringify(manager.list(), null, 2))
      break
    case 'check':
      if (args.length > 1) failUsage()
      console.log(JSON.stringify(await Promise.all((args.length ? args : manager.list().map(({ name }) => name)).map((name) => manager.check(name))), null, 2))
      break
    case 'install':
      if (args.length !== 2) failUsage()
      manager.install(args[0]!, args[1]!)
      console.log(`Installed and linked ${args[1]}`)
      break
    case 'recover':
      if (args.length !== 2) failUsage()
      console.log(`${args[0]}: recovered from upstream ${await manager.recover(args[0]!, args[1]!)}`)
      break
    case 'link':
    case 'adopt':
    case 'uninstall':
    case 'unlink':
      if (args.length !== 1) failUsage()
      manager[command](args[0]!)
      console.log(`${command} completed for ${args[0]}`)
      break
    case 'update':
      if (args.length !== 1) failUsage()
      console.log(`${args[0]}: ${await manager.update(args[0]!)}`)
      break
    default:
      failUsage()
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exitCode = 1
})
