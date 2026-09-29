import { afterEach, describe, expect, test } from 'bun:test'
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, rmSync, symlinkSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { GlobalSkillManager, type IManagerDependencies } from '../src/global-skill-manager'
import { gitTreeHash } from '../src/git-tree-hash'

const roots: string[] = []
const create = () => {
  const home = mkdtempSync(join(tmpdir(), 'global-skills-'))
  roots.push(home)
  const calls: string[][] = []
  const canonical = join(home, '.agents', 'skills', 'good-skill')
  const letta = join(home, '.letta', 'skills', 'good-skill')
  const lockPath = join(home, '.agents', '.skill-lock.json')
  const hash = 'a'.repeat(40)
  const lock = (source = 'owner/repo', folderHash = hash) => {
    mkdirSync(join(home, '.agents'), { recursive: true })
    writeFileSync(lockPath, JSON.stringify({ version: 3, skills: {
      'good-skill': { source, sourceType: 'github', skillPath: 'skills/good-skill/SKILL.md', skillFolderHash: folderHash },
    } }))
  }
  const source = () => {
    mkdirSync(canonical, { recursive: true })
    writeFileSync(join(canonical, 'SKILL.md'), '---\nname: good-skill\ndescription: Good\n---\n')
    lock()
  }
  const deps: IManagerDependencies = {
    run(args, passedHome) {
      expect(passedHome).toBe(home)
      calls.push(args)
      if (args[0] === 'add') source()
      if (args[0] === 'remove') {
        rmSync(canonical, { recursive: true })
        writeFileSync(lockPath, JSON.stringify({ version: 3, skills: {} }))
      }
    },
    async tree() { return { sha: 'b'.repeat(40), tree: [{ path: 'skills/good-skill', type: 'tree', sha: hash }] } },
    async history() { return [] },
    async defaultBranch() { return 'main' },
  }
  return { home, calls, canonical, letta, lock, source, deps, manager: new GlobalSkillManager(home, deps) }
}

afterEach(() => { for (const root of roots.splice(0)) rmSync(root, { recursive: true, force: true }) })

describe('global skill manager with disposable HOME', () => {
  test('installs through official CLI, links Letta and removes both via receipt', () => {
    const fixture = create()
    fixture.manager.install('owner/repo', 'good-skill')
    expect(fixture.calls[0]).toEqual(['add', 'owner/repo', '--skill', 'good-skill', '-g', '-a', 'cline', '-y'])
    expect(readlinkSync(fixture.letta)).toBe(fixture.canonical)
    expect(fixture.manager.list()[0]).toMatchObject({ installedByManager: true, lettaOwned: true, letta: 'linked', source: 'owner/repo' })
    fixture.manager.uninstall('good-skill')
    expect(fixture.calls[1]).toEqual(['remove', 'good-skill', '-g', '-a', 'cline', '-y'])
    expect(existsSync(fixture.canonical)).toBe(false)
    expect(existsSync(fixture.letta)).toBe(false)
    expect(JSON.parse(readFileSync(fixture.manager.receiptPath, 'utf8')).skills).toEqual({})
  })

  test('reads upstream folder tree hash without mutating and fails closed on unsupported sources', async () => {
    const fixture = create()
    fixture.source()
    expect(fixture.manager.list()[0]).toMatchObject({ update: 'not-checked' })
    expect(await fixture.manager.check('good-skill')).toMatchObject({ update: 'current' })
    fixture.deps.tree = async () => ({ sha: 'b'.repeat(40), tree: [{ path: 'skills/good-skill', type: 'tree', sha: 'b'.repeat(40) }] })
    expect(await fixture.manager.check('good-skill')).toMatchObject({ update: 'available' })
    expect(fixture.calls).toEqual([])
    writeFileSync(fixture.manager.lockPath, JSON.stringify({ version: 3, skills: { 'good-skill': { source: 'private/source', sourceType: 'local' } } }))
    expect(await fixture.manager.check('good-skill')).toMatchObject({ update: 'unknown' })
    fixture.deps.tree = async () => { throw new Error('offline') }
    fixture.lock()
    expect(await fixture.manager.check('good-skill')).toMatchObject({ update: 'unknown', reason: 'Upstream unavailable: offline' })
  })

  test('inspection plans a manager update without writing or losing local-change protection', async () => {
    const fixture = create()
    fixture.manager.install('owner/repo', 'good-skill')
    const receipt = readFileSync(fixture.manager.receiptPath, 'utf8')
    fixture.deps.tree = async () => ({ sha: 'b'.repeat(40), tree: [{ path: 'skills/good-skill', type: 'tree', sha: 'b'.repeat(40) }] })
    expect(await fixture.manager.inspect('good-skill')).toMatchObject({
      primaryAction: 'update', fileHealth: 'clean', upstream: 'available', ownership: 'installed',
      eligibleSecondaryActions: ['unlink', 'uninstall'],
    })
    expect(readFileSync(fixture.manager.receiptPath, 'utf8')).toBe(receipt)
    expect(fixture.calls).toHaveLength(1)
    writeFileSync(join(fixture.canonical, 'user-note.txt'), 'local work')
    expect(await fixture.manager.inspect('good-skill')).toMatchObject({ fileHealth: 'modified', primaryAction: 'none' })
    expect(fixture.manager.update('good-skill')).rejects.toThrow('Canonical skill changed')
    expect(fixture.calls).toHaveLength(1)
  })

  test('upstream outage blocks Update but keeps safe local removal available', async () => {
    const fixture = create()
    fixture.manager.install('owner/repo', 'good-skill')
    fixture.deps.tree = async () => { throw new Error('offline') }
    expect(await fixture.manager.inspect('good-skill')).toMatchObject({
      primaryAction: 'none', upstream: 'unknown', eligibleSecondaryActions: ['unlink', 'uninstall'],
    })
    expect(fixture.calls).toHaveLength(1)
  })

  test('inspection recognizes a matching external lock without adopting it', async () => {
    const fixture = create()
    fixture.source()
    fixture.lock('owner/repo', gitTreeHash(fixture.canonical))
    fixture.deps.tree = async () => ({ sha: 'b'.repeat(40), tree: [{ path: 'skills/good-skill', type: 'tree', sha: 'b'.repeat(40) }] })
    expect(await fixture.manager.inspect('good-skill')).toMatchObject({ primaryAction: 'adopt-update', fileHealth: 'clean', ownership: 'external-locked' })
    expect(existsSync(fixture.manager.receiptPath)).toBe(false)
    expect(fixture.calls).toEqual([])
    fixture.lock('owner/repo', 'a'.repeat(40))
    expect(await fixture.manager.inspect('good-skill')).toMatchObject({ primaryAction: 'none', fileHealth: 'modified' })
    expect(() => fixture.manager.adopt('good-skill')).toThrow('differs from its official lock')
  })

  test('a manager-owned link can be promoted to update-only tracking without claiming a foreign link', async () => {
    const fixture = create()
    fixture.source()
    fixture.lock('owner/repo', gitTreeHash(fixture.canonical))
    fixture.manager.link('good-skill')
    const originalLink = readlinkSync(fixture.letta)
    fixture.deps.tree = async () => ({ sha: 'b'.repeat(40), tree: [{ path: 'skills/good-skill', type: 'tree', sha: 'b'.repeat(40) }] })
    expect(await fixture.manager.inspect('good-skill')).toMatchObject({ primaryAction: 'adopt-update', lettaHealth: 'linked-managed' })
    fixture.manager.adopt('good-skill')
    expect(fixture.manager.list()[0]).toMatchObject({ adoptedForUpdate: true, lettaOwned: true, letta: 'linked' })
    expect(readlinkSync(fixture.letta)).toBe(originalLink)
    expect(() => fixture.manager.uninstall('good-skill')).toThrow('update-only')
  })

  test('lockless source inspection matches history without writing an update-only receipt', async () => {
    const fixture = create()
    fixture.source()
    writeFileSync(fixture.manager.lockPath, JSON.stringify({ version: 3, skills: {} }))
    const hash = gitTreeHash(fixture.canonical)
    const commit = 'c'.repeat(40)
    fixture.deps.history = async () => [commit]
    fixture.deps.tree = async (_ownerRepo, ref) => ({ sha: ref ?? 'b'.repeat(40), tree: [
      { path: 'skills/good-skill', type: 'tree', sha: ref ? hash : 'b'.repeat(40) },
    ] })
    expect(await fixture.manager.inspect('good-skill')).toMatchObject({ ownership: 'external-lockless', primaryAction: 'none' })
    const checked = await fixture.manager.inspect('good-skill', 'https://github.com/owner/repo/tree/main/skills/good-skill')
    expect(checked).toMatchObject({ primaryAction: 'recover-update', upstream: 'available', fileHealth: 'clean', matchedCommit: commit })
    expect(existsSync(fixture.manager.receiptPath)).toBe(false)
    expect(fixture.calls).toEqual([])
    fixture.deps.tree = async () => ({ sha: commit, tree: [{ path: 'skills/good-skill', type: 'tree', sha: hash }] })
    expect(await fixture.manager.inspect('good-skill', 'owner/repo')).toMatchObject({ primaryAction: 'recover-only', upstream: 'current' })
  })

  test('lockless recovery preserves a link this manager already owns', async () => {
    const fixture = create()
    fixture.source()
    writeFileSync(fixture.manager.lockPath, JSON.stringify({ version: 3, skills: {} }))
    fixture.manager.link('good-skill')
    const hash = gitTreeHash(fixture.canonical)
    const commit = 'c'.repeat(40)
    fixture.deps.history = async () => [commit]
    fixture.deps.tree = async () => ({ sha: commit, tree: [{ path: 'skills/good-skill', type: 'tree', sha: hash }] })
    expect(await fixture.manager.inspect('good-skill', 'owner/repo')).toMatchObject({ primaryAction: 'recover-only', lettaHealth: 'linked-managed' })
    await fixture.manager.recover('good-skill', 'owner/repo')
    expect(fixture.manager.list()[0]).toMatchObject({ adoptedForUpdate: true, lettaOwned: true, letta: 'linked' })
    expect(readlinkSync(fixture.letta)).toBe(fixture.canonical)
    expect(() => fixture.manager.uninstall('good-skill')).toThrow('update-only')
  })

  test('inspection blocks pinned sources and foreign Letta paths without calling installer', async () => {
    const fixture = create()
    fixture.source()
    fixture.lock('owner/repo', gitTreeHash(fixture.canonical))
    const entry = JSON.parse(readFileSync(fixture.manager.lockPath, 'utf8'))
    entry.skills['good-skill'].ref = 'v1'
    writeFileSync(fixture.manager.lockPath, JSON.stringify(entry))
    expect(await fixture.manager.inspect('good-skill')).toMatchObject({ primaryAction: 'none', primaryActionDisabledReason: 'This skill is pinned to a version; update it manually' })
    fixture.lock('owner/repo', gitTreeHash(fixture.canonical))
    mkdirSync(join(fixture.home, '.letta', 'skills'), { recursive: true })
    writeFileSync(fixture.letta, 'foreign')
    expect(await fixture.manager.inspect('good-skill')).toMatchObject({ primaryAction: 'none', lettaHealth: 'foreign' })
    expect(fixture.calls).toEqual([])
  })

  test('update refuses local edits and lock drift that occur during the upstream request', async () => {
    const fixture = create()
    fixture.manager.install('owner/repo', 'good-skill')
    fixture.deps.tree = async () => {
      writeFileSync(join(fixture.canonical, 'user-note.txt'), 'added during network request')
      return { sha: 'b'.repeat(40), tree: [{ path: 'skills/good-skill', type: 'tree', sha: 'b'.repeat(40) }] }
    }
    await expect(fixture.manager.update('good-skill')).rejects.toThrow('Canonical skill changed')
    expect(fixture.calls).toHaveLength(1)
    rmSync(join(fixture.canonical, 'user-note.txt'))
    fixture.deps.tree = async () => {
      writeFileSync(join(fixture.canonical, 'user-note.txt'), 'changed while upstream reported current')
      return { sha: 'b'.repeat(40), tree: [{ path: 'skills/good-skill', type: 'tree', sha: 'a'.repeat(40) }] }
    }
    await expect(fixture.manager.update('good-skill')).rejects.toThrow('Canonical skill changed')
    expect(fixture.calls).toHaveLength(1)
    rmSync(join(fixture.canonical, 'user-note.txt'))
    fixture.deps.tree = async () => {
      fixture.lock('other/repo')
      return { sha: 'b'.repeat(40), tree: [{ path: 'skills/good-skill', type: 'tree', sha: 'b'.repeat(40) }] }
    }
    await expect(fixture.manager.update('good-skill')).rejects.toThrow('Source or manager record changed during upstream check')
    expect(fixture.calls).toHaveLength(1)
  })

  test('does not claim existing Letta path or remove an unowned canonical skill', () => {
    const fixture = create()
    fixture.source()
    mkdirSync(join(fixture.home, '.letta', 'skills'), { recursive: true })
    writeFileSync(fixture.letta, 'other owner')
    expect(() => fixture.manager.link('good-skill')).toThrow('already belongs')
    expect(() => fixture.manager.install('owner/repo', 'good-skill')).toThrow('already exists')
    expect(() => fixture.manager.uninstall('good-skill')).toThrow('Not installed by this manager')
    expect(fixture.calls).toEqual([])
  })

  test('adopted link can be unlinked but does not authorize canonical uninstall', () => {
    const fixture = create()
    fixture.source()
    fixture.manager.link('good-skill')
    expect(fixture.manager.list()[0]).toMatchObject({ installedByManager: false, lettaOwned: true })
    expect(() => fixture.manager.uninstall('good-skill')).toThrow('use unlink')
    fixture.manager.unlink('good-skill')
    expect(existsSync(fixture.canonical)).toBe(true)
    expect(existsSync(fixture.letta)).toBe(false)
  })

  test('adopts an exact GitHub tree as update-only without claiming an existing Letta link', async () => {
    const fixture = create()
    fixture.source()
    fixture.lock('owner/repo', gitTreeHash(fixture.canonical))
    mkdirSync(join(fixture.home, '.letta', 'skills'), { recursive: true })
    symlinkSync(fixture.canonical, fixture.letta)
    fixture.manager.adopt('good-skill')
    expect(fixture.manager.list()[0]).toMatchObject({ installedByManager: false, adoptedForUpdate: true, lettaOwned: false, letta: 'linked' })
    expect(() => fixture.manager.uninstall('good-skill')).toThrow('update-only')
    expect(() => fixture.manager.unlink('good-skill')).toThrow('No manager-owned Letta link')
    fixture.deps.tree = async () => ({ sha: 'b'.repeat(40), tree: [{ path: 'skills/good-skill', type: 'tree', sha: 'b'.repeat(40) }] })
    expect(await fixture.manager.update('good-skill')).toBe('updated')
    expect(fixture.calls).toEqual([['add', 'owner/repo', '--skill', 'good-skill', '-g', '-a', 'cline', '-y']])
    expect(lstatSync(fixture.letta).isSymbolicLink()).toBe(true)
  })

  test('refuses adoption on local edits, missing provenance, or mismatched Letta path', async () => {
    const fixture = create()
    fixture.source()
    expect(() => fixture.manager.adopt('good-skill')).toThrow('differs from its official lock tree')
    fixture.lock('owner/repo', gitTreeHash(fixture.canonical))
    writeFileSync(join(fixture.canonical, 'user-note.txt'), 'user owned')
    expect(() => fixture.manager.adopt('good-skill')).toThrow('differs from its official lock tree')
    rmSync(join(fixture.canonical, 'user-note.txt'))
    fixture.manager.adopt('good-skill')
    mkdirSync(join(fixture.home, '.letta', 'skills'), { recursive: true })
    symlinkSync(fixture.canonical, fixture.letta)
    await expect(fixture.manager.update('good-skill')).rejects.toThrow('Pre-existing Letta path changed')
    expect(fixture.calls).toEqual([])
  })

  test('adopted update blocks later file edits and never claims a pre-existing link', async () => {
    const fixture = create()
    fixture.source()
    fixture.lock('owner/repo', gitTreeHash(fixture.canonical))
    mkdirSync(join(fixture.home, '.letta', 'skills'), { recursive: true })
    symlinkSync(fixture.canonical, fixture.letta)
    fixture.manager.adopt('good-skill')
    writeFileSync(join(fixture.canonical, 'SKILL.md'), 'user edit')
    await expect(fixture.manager.update('good-skill')).rejects.toThrow('Canonical skill changed')
    expect(lstatSync(fixture.letta).isSymbolicLink()).toBe(true)
    expect(fixture.calls).toEqual([])
  })

  test('recovers an exact historical GitHub tree without official lock, then updates only on request', async () => {
    const fixture = create()
    fixture.source()
    writeFileSync(fixture.manager.lockPath, JSON.stringify({ version: 3, skills: {} }))
    mkdirSync(join(fixture.home, '.letta', 'skills'), { recursive: true })
    symlinkSync(fixture.canonical, fixture.letta)
    const oldHash = gitTreeHash(fixture.canonical)
    const commit = 'c'.repeat(40)
    fixture.deps.history = async (owner, path) => {
      expect(owner).toBe('owner/repo')
      expect(path).toBe('skills/good-skill')
      return [commit]
    }
    fixture.deps.tree = async (_owner, ref) => ({
      sha: 'b'.repeat(40), tree: [{ path: 'skills/good-skill', type: 'tree', sha: ref === commit ? oldHash : 'b'.repeat(40) }],
    })
    expect(await fixture.manager.recover('good-skill', 'https://github.com/owner/repo/tree/main/skills/good-skill')).toBe(commit)
    expect(fixture.manager.list()[0]).toMatchObject({ source: 'owner/repo', installedByManager: false, adoptedForUpdate: true, lettaOwned: false, letta: 'linked' })
    expect(await fixture.manager.check('good-skill')).toMatchObject({ update: 'available' })
    expect(() => fixture.manager.uninstall('good-skill')).toThrow('update-only')
    expect(fixture.calls).toEqual([])
    expect(await fixture.manager.update('good-skill')).toBe('updated')
    expect(fixture.calls).toEqual([['add', 'owner/repo', '--skill', 'good-skill', '-g', '-a', 'cline', '-y']])
    expect(lstatSync(fixture.letta).isSymbolicLink()).toBe(true)
  })

  test('recovery refuses unproven history, wrong path and a changing local snapshot', async () => {
    const fixture = create()
    fixture.source()
    writeFileSync(fixture.manager.lockPath, JSON.stringify({ version: 3, skills: {} }))
    const commit = 'd'.repeat(40)
    fixture.deps.history = async () => [commit]
    fixture.deps.tree = async () => ({ sha: commit, tree: [{ path: 'skills/good-skill', type: 'tree', sha: 'f'.repeat(40) }] })
    await expect(fixture.manager.recover('good-skill', 'https://github.com/owner/repo/tree/main/skills/other')).rejects.toThrow('ending in skills/<selected-name>')
    await expect(fixture.manager.recover('good-skill', 'owner/repo')).rejects.toThrow('No exact upstream Git tree match')
    const original = readFileSync(join(fixture.canonical, 'SKILL.md'), 'utf8')
    const originalHash = gitTreeHash(fixture.canonical)
    fixture.deps.tree = async () => {
      writeFileSync(join(fixture.canonical, 'SKILL.md'), 'changed during lookup')
      return { sha: commit, tree: [{ path: 'skills/good-skill', type: 'tree', sha: originalHash }] }
    }
    await expect(fixture.manager.recover('good-skill', 'owner/repo')).rejects.toThrow('changed during recovery')
    writeFileSync(join(fixture.canonical, 'SKILL.md'), original)
    fixture.deps.defaultBranch = async () => 'master'
    await expect(fixture.manager.recover('good-skill', 'https://github.com/owner/repo/tree/main/skills/good-skill')).rejects.toThrow('default branch')
    expect(existsSync(fixture.manager.receiptPath)).toBe(false)
  })

  test('updates only through scoped add after a verified upstream change', async () => {
    const fixture = create()
    fixture.manager.install('owner/repo', 'good-skill')
    expect(await fixture.manager.update('good-skill')).toBe('current')
    expect(fixture.calls).toHaveLength(1)
    fixture.deps.tree = async () => ({ sha: 'b'.repeat(40), tree: [{ path: 'skills/good-skill', type: 'tree', sha: 'b'.repeat(40) }] })
    expect(await fixture.manager.update('good-skill')).toBe('updated')
    expect(fixture.calls[1]).toEqual(['add', 'owner/repo', '--skill', 'good-skill', '-g', '-a', 'cline', '-y'])
  })

  test('refuses update and uninstall after local edits to the installed directory', async () => {
    const fixture = create()
    fixture.manager.install('owner/repo', 'good-skill')
    writeFileSync(join(fixture.canonical, 'user-note.txt'), 'do not lose this')
    fixture.deps.tree = async () => ({ sha: 'b'.repeat(40), tree: [{ path: 'skills/good-skill', type: 'tree', sha: 'b'.repeat(40) }] })
    expect(fixture.manager.update('good-skill')).rejects.toThrow('Canonical skill changed')
    expect(() => fixture.manager.uninstall('good-skill')).toThrow('Canonical skill changed')
    expect(fixture.calls).toHaveLength(1)
    expect(readFileSync(join(fixture.canonical, 'user-note.txt'), 'utf8')).toBe('do not lose this')
  })

  test('refuses removal when another agent has a link to the canonical copy', () => {
    const fixture = create()
    fixture.manager.install('owner/repo', 'good-skill')
    const foreign = join(fixture.home, '.config', 'opencode', 'skills')
    mkdirSync(foreign, { recursive: true })
    symlinkSync(fixture.canonical, join(foreign, 'good-skill'))
    expect(() => fixture.manager.uninstall('good-skill')).toThrow('Another agent links')
    expect(fixture.calls).toHaveLength(1)
    expect(lstatSync(fixture.letta).isSymbolicLink()).toBe(true)
  })

  test('failed receipt write cannot claim ownership of a Letta link', () => {
    const fixture = create()
    fixture.source()
    mkdirSync(join(fixture.home, '.agents'), { recursive: true })
    writeFileSync(`${fixture.manager.receiptPath}.tmp-${process.pid}`, 'occupied')
    expect(() => fixture.manager.link('good-skill')).toThrow()
    expect(lstatSync(fixture.letta).isSymbolicLink()).toBe(true)
    expect(() => fixture.manager.unlink('good-skill')).toThrow('No manager-owned Letta link')
  })

  test('refuses drifted link and source before invoking remove or update', async () => {
    const fixture = create()
    fixture.manager.install('owner/repo', 'good-skill')
    fixture.lock('other/repo')
    expect(fixture.manager.update('good-skill')).rejects.toThrow('Official source changed')
    expect(() => fixture.manager.uninstall('good-skill')).toThrow('Official source changed')
    fixture.lock()
    rmSync(fixture.letta)
    symlinkSync(fixture.home, fixture.letta)
    expect(() => fixture.manager.uninstall('good-skill')).toThrow('Letta link drifted')
    expect(fixture.calls).toHaveLength(1)
  })

  test('retains receipt and Letta link if official removal fails or canonical remains in use', () => {
    const fixture = create()
    fixture.manager.install('owner/repo', 'good-skill')
    fixture.deps.run = () => { throw new Error('official failure') }
    expect(() => fixture.manager.uninstall('good-skill')).toThrow('official failure')
    expect(lstatSync(fixture.letta).isSymbolicLink()).toBe(true)
    expect(fixture.manager.list()[0]?.installedByManager).toBe(true)
    fixture.deps.run = () => {} // Official CLI succeeded but another agent still owns canonical.
    expect(() => fixture.manager.uninstall('good-skill')).toThrow('retained')
    expect(lstatSync(fixture.letta).isSymbolicLink()).toBe(true)
  })

  test('rejects unsafe names and malformed receipt before mutation', () => {
    const fixture = create()
    expect(() => fixture.manager.install('owner/repo', '../escape')).toThrow('Unsafe skill name')
    expect(() => fixture.manager.install('owner/repo', 'Good-Skill')).toThrow('Unsafe skill name')
    expect(() => fixture.manager.install('../repo', 'good-skill')).toThrow('Install source must')
    mkdirSync(join(fixture.home, '.agents'), { recursive: true })
    writeFileSync(fixture.manager.receiptPath, '{}')
    expect(() => fixture.manager.install('owner/repo', 'good-skill')).toThrow('Invalid manager receipt')
    expect(fixture.calls).toEqual([])
  })

  test('refuses symlinked skill roots before a mutation', () => {
    const fixture = create()
    mkdirSync(join(fixture.home, '.letta'), { recursive: true })
    symlinkSync(fixture.home, join(fixture.home, '.letta', 'skills'))
    expect(() => fixture.manager.install('owner/repo', 'good-skill')).toThrow('not a regular directory')
    expect(fixture.calls).toEqual([])
  })
})
