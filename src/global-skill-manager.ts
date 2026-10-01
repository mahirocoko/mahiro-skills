import { randomUUID } from 'node:crypto'
import { existsSync, lstatSync, mkdirSync, readFileSync, readdirSync, readlinkSync, realpathSync, renameSync, rmdirSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'

import { hashPath } from './content-hash'
import { gitTreeHash } from './git-tree-hash'

type LockEntry = {
  source?: string
  sourceType?: string
  sourceUrl?: string
  ref?: string
  skillPath?: string
  skillFolderHash?: string
}

type ManagedEntry = {
  source: string
  link: boolean
  agy?: boolean
  installedHash?: string
  ownership?: 'installed' | 'adopted'
  observedLetta?: 'linked' | 'absent'
  historical?: { skillPath: string; folderHash: string; commitSha: string }
}
type Receipt = { version: 1; skills: Record<string, ManagedEntry> }
type LockDocument = { version: 3; skills: Record<string, LockEntry>; [key: string]: unknown }
type RemovalJournal = {
  version: 1
  name: string
  stage: string
  canonical: string
  canonicalIdentity: string
  links: Array<{ path: string; staged: string; target: string; identity: string }>
  lockBefore: string
  lockAfter: string
  receiptBefore: string | null
  receiptAfter: string | null
}
type UpdateState = 'not-checked' | 'current' | 'available' | 'unknown'

export type OwnershipKind = 'installed' | 'adopted' | 'external-locked' | 'external-lockless'
export type LocalFileHealth = 'clean' | 'modified' | 'missing' | 'unknown'
export type LettaLinkHealth = 'linked-managed' | 'linked-external' | 'absent' | 'foreign' | 'drifted'
export type PrimaryActionKind = 'update' | 'adopt-update' | 'recover-update' | 'recover-only' | 'none'

export interface ISkillInspection {
  name: string
  source: string | null
  ownership: OwnershipKind
  ownershipLabel: string
  fileHealth: LocalFileHealth
  fileHealthDetail: string
  lettaHealth: LettaLinkHealth
  lettaHealthDetail: string
  agyHealth: LettaLinkHealth
  agyHealthDetail: string
  upstream: UpdateState
  upstreamReason?: string
  primaryAction: PrimaryActionKind
  primaryActionLabel: string
  primaryActionDisabledReason?: string
  eligibleSecondaryActions: Array<'link' | 'unlink' | 'uninstall'>
  uninstallBlockedReason?: string
  plannedWrites: string[]
  matchedCommit?: string
}

export interface IManagedSkill {
  name: string
  source: string | null
  installedByManager: boolean
  adoptedForUpdate: boolean
  lettaOwned: boolean
  letta: 'linked' | 'absent' | 'other'
  agyOwned: boolean
  agy: 'linked' | 'absent' | 'other'
  update: UpdateState
  reason?: string
}

export interface IManagerDependencies {
  run(args: string[], home: string): void
  tree(ownerRepo: string, ref?: string): Promise<{ sha: string; truncated?: boolean; tree: Array<{ path: string; type: string; sha: string }> }>
  history(ownerRepo: string, folderPath: string): Promise<string[]>
  defaultBranch(ownerRepo: string): Promise<string>
}

const EMPTY_RECEIPT = (): Receipt => ({ version: 1, skills: {} })
// Mirror the official CLI's stable canonical-name subset, without accepting
// values it would rewrite (including case, trailing punctuation, or >255 chars).
const SKILL_NAME = /^[a-z0-9](?:[a-z0-9._-]*[a-z0-9_])?$/
const GITHUB_SOURCE = /^(?:https:\/\/github\.com\/)?([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9._-]*)(?:\.git)?$/i
const TREE_URL = /^https:\/\/github\.com\/([a-z0-9][a-z0-9-]*)\/([a-z0-9][a-z0-9._-]*)\/tree\/(main|master)\/skills\/([a-z0-9][a-z0-9._-]*)\/?$/i

const assertName = (name: string): void => {
  if (!SKILL_NAME.test(name) || name.length > 255 || name.includes('..')) {
    throw new Error(`Unsafe skill name: ${name}`)
  }
}

const lstat = (path: string): ReturnType<typeof lstatSync> | null => {
  try { return lstatSync(path) } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null
    throw error
  }
}

const identity = (state: NonNullable<ReturnType<typeof lstatSync>>): string => `${state.dev}:${state.ino}`

const readJson = (path: string): unknown => JSON.parse(readFileSync(path, 'utf8'))

const writeReceipt = (path: string, receipt: Receipt): void => {
  mkdirSync(dirname(path), { recursive: true })
  const temporary = `${path}.tmp-${process.pid}`
  let created = false
  try {
    writeFileSync(temporary, `${JSON.stringify(receipt, null, 2)}\n`, { flag: 'wx', mode: 0o600 })
    created = true
    renameSync(temporary, path)
  } catch (error) {
    if (created && lstat(temporary)) unlinkSync(temporary)
    throw error
  }
}

const writeAtomic = (path: string, contents: string): void => {
  const temporary = `${path}.tmp-${process.pid}-${randomUUID()}`
  try {
    writeFileSync(temporary, contents, { flag: 'wx', mode: 0o600 })
    renameSync(temporary, path)
  } catch (error) {
    if (lstat(temporary)) unlinkSync(temporary)
    throw error
  }
}

export class GlobalSkillManager {
  readonly canonicalRoot: string
  readonly lettaRoot: string
  readonly agyRoot: string
  readonly receiptPath: string
  readonly lockPath: string

  constructor(readonly home: string, private readonly deps: IManagerDependencies) {
    this.canonicalRoot = join(home, '.agents', 'skills')
    this.lettaRoot = join(home, '.letta', 'skills')
    this.agyRoot = join(home, '.gemini', 'antigravity-cli', 'skills')
    this.receiptPath = join(home, '.agents', 'mahiro-global-skill-manager.json')
    this.lockPath = join(home, '.agents', '.skill-lock.json')
  }

  private receipt(): Receipt {
    if (!existsSync(this.receiptPath)) return EMPTY_RECEIPT()
    const value = readJson(this.receiptPath) as Receipt
    if (value?.version !== 1 || !value.skills || typeof value.skills !== 'object' || Array.isArray(value.skills)) {
      throw new Error('Invalid manager receipt; refusing to mutate skills')
    }
    return value
  }

  private lock(): Record<string, LockEntry> {
    if (!existsSync(this.lockPath)) return {}
    return this.lockDocument().value.skills
  }

  private lockDocument(): { raw: string; value: LockDocument } {
    const state = lstat(this.lockPath)
    if (!state?.isFile() || state.nlink !== 1) throw new Error('Official global lock is missing or not a regular private file')
    const raw = readFileSync(this.lockPath, 'utf8')
    const value = JSON.parse(raw) as LockDocument
    if (value?.version !== 3 || !value.skills || typeof value.skills !== 'object' || Array.isArray(value.skills)) {
      throw new Error('Invalid official global lock; refusing to infer skill provenance')
    }
    return { raw, value }
  }

  private canonical(name: string): string { assertName(name); return join(this.canonicalRoot, name) }
  private linkPath(name: string): string { assertName(name); return join(this.lettaRoot, name) }
  private agyLinkPath(name: string): string { assertName(name); return join(this.agyRoot, name) }

  private assertWriteRoots(): void {
    for (const path of [
      join(this.home, '.agents'), this.canonicalRoot, join(this.home, '.letta'), this.lettaRoot,
      join(this.home, '.gemini'), join(this.home, '.gemini', 'antigravity-cli'), this.agyRoot,
    ]) {
      const state = lstat(path)
      if (state && !state.isDirectory()) throw new Error(`Skill root is not a regular directory: ${path}`)
    }
  }

  private slotState(path: string, name: string): IManagedSkill['letta'] {
    const state = lstat(path)
    if (!state) return 'absent'
    return state.isSymbolicLink() && resolve(dirname(path), readlinkSync(path)) === this.canonical(name) ? 'linked' : 'other'
  }

  private linkState(name: string): IManagedSkill['letta'] {
    return this.slotState(this.linkPath(name), name)
  }

  private agyState(name: string): IManagedSkill['agy'] {
    return this.slotState(this.agyLinkPath(name), name)
  }

  private assertCanonical(name: string): void {
    const path = this.canonical(name)
    if (!lstat(path)?.isDirectory() || !lstat(join(path, 'SKILL.md'))?.isFile()) {
      throw new Error(`Missing regular canonical skill: ${name}`)
    }
  }

  private assertUnchanged(name: string, managed: ManagedEntry): void {
    if (!managed.installedHash || hashPath(this.canonical(name)) !== managed.installedHash) {
      throw new Error(`Canonical skill changed since manager install: ${name}; refusing to overwrite or remove local changes`)
    }
  }

  private assertObservedLetta(name: string, managed: ManagedEntry): void {
    if (managed.ownership === 'adopted' && !managed.link && this.linkState(name) !== managed.observedLetta) {
      throw new Error(`Pre-existing Letta path changed since adoption: ${name}`)
    }
  }

  private linkOnly(name: string, entry?: ManagedEntry): boolean {
    return !!entry && !entry.source && !entry.ownership && entry.link && this.linkState(name) === 'linked'
  }

  private assertNoForeignLinks(name: string, includeExistingAgyLink = false): void {
    // Inspect only skill-named slots in common agent roots, never scan file
    // contents or recurse into unrelated HOME directories.
    const roots = new Set<string>([
      join(this.home, '.claude', 'skills'), join(this.home, '.codex', 'skills'),
      join(this.home, '.cursor', 'skills'), join(this.home, '.cline', 'skills'),
      join(this.home, '.gemini', 'skills'), this.agyRoot, join(this.home, '.opencode', 'skills'),
      join(this.home, '.config', 'opencode', 'skills'),
    ])
    const agyState = this.agyState(name)
    const ownedAgy = this.receipt().skills[name]?.agy && agyState === 'linked'
    const canonical = this.canonical(name)
    const canonicalReal = realpathSync(canonical)
    for (const root of roots) {
      if ((ownedAgy || (includeExistingAgyLink && agyState === 'linked')) && root === this.agyRoot) continue
      const path = join(root, name)
      const state = lstat(path)
      if (!state) continue
      const direct = state.isSymbolicLink() && resolve(dirname(path), readlinkSync(path)) === canonical
      let resolved = false
      try { resolved = realpathSync(path) === canonicalReal } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
      }
      if (direct || resolved) {
        throw new Error(`Another agent links to ${name}: ${path}; remove that dependency before uninstall`)
      }
    }
  }

  list(): IManagedSkill[] {
    const receipt = this.receipt()
    const lock = this.lock()
    const names = new Set(Object.keys(receipt.skills))
    if (existsSync(this.canonicalRoot)) {
      for (const entry of readdirSync(this.canonicalRoot, { withFileTypes: true })) {
        if (entry.isDirectory() && SKILL_NAME.test(entry.name) && entry.name.length <= 255 && !entry.name.includes('..')) names.add(entry.name)
      }
    }
    return [...names].sort().map((name) => {
      assertName(name)
      const entry = lock[name]
      return {
        name,
        source: entry?.source ?? receipt.skills[name]?.source ?? null,
        installedByManager: !!receipt.skills[name]?.source && receipt.skills[name]?.ownership !== 'adopted',
        adoptedForUpdate: receipt.skills[name]?.ownership === 'adopted',
        lettaOwned: !!receipt.skills[name]?.link,
        letta: this.linkState(name),
        agyOwned: !!receipt.skills[name]?.agy,
        agy: this.agyState(name),
        update: 'not-checked' as const,
        reason: entry ? undefined : 'No official global lock entry',
      }
    })
  }

  async check(name: string): Promise<IManagedSkill> {
    assertName(name)
    const item = this.list().find((entry) => entry.name === name)
    if (!item) throw new Error(`Skill not installed: ${name}`)
    const locked = this.lock()[name]
    const recovered = this.receipt().skills[name]
    const entry = locked ?? (recovered?.historical ? {
      source: recovered.source, sourceType: 'github', skillPath: recovered.historical.skillPath,
      skillFolderHash: recovered.historical.folderHash,
    } : undefined)
    if (entry?.sourceType !== 'github' || !entry.skillPath || !/^[a-f0-9]{40}$/i.test(entry.skillFolderHash ?? '')) {
      return { ...item, update: 'unknown', reason: 'No supported GitHub tree hash in official lock' }
    }
    const sourceMatch = (entry.source ?? '').match(GITHUB_SOURCE)
    const ownerRepo = sourceMatch && !sourceMatch[2]?.includes('..') ? `${sourceMatch[1]}/${sourceMatch[2]}` : null
    if (!ownerRepo) return { ...item, update: 'unknown', reason: 'Unsupported GitHub source identity' }
    try {
      const tree = await this.deps.tree(ownerRepo, entry.ref)
      if (tree.truncated) return { ...item, update: 'unknown', reason: 'GitHub tree is truncated' }
      const folder = dirname(entry.skillPath).replaceAll('\\', '/')
      const latest = folder === '.' ? tree.sha : tree.tree.find((node) => node.path === folder && node.type === 'tree')?.sha
      if (!latest) return { ...item, update: 'unknown', reason: 'Skill folder not found upstream; no automatic migration' }
      return { ...item, update: latest === entry.skillFolderHash ? 'current' : 'available', reason: undefined }
    } catch (error) {
      return { ...item, update: 'unknown', reason: `Upstream unavailable: ${error instanceof Error ? error.message : String(error)}` }
    }
  }

  async inspect(name: string, sourceUrl?: string): Promise<ISkillInspection> {
    assertName(name)
    const item = this.list().find((skill) => skill.name === name)
    if (!item) throw new Error(`Skill not installed: ${name}`)
    const managed = this.receipt().skills[name]
    const locked = this.lock()[name]
    const ownership: OwnershipKind = item.installedByManager ? 'installed' : item.adoptedForUpdate ? 'adopted'
      : locked ? 'external-locked' : 'external-lockless'
    const state = this.linkState(name)
    const agyState = this.agyState(name)
    const lettaHealth: LettaLinkHealth = state === 'other' ? 'foreign'
      : managed?.link && state !== 'linked' ? 'drifted'
      : managed?.link ? 'linked-managed' : state === 'linked' ? 'linked-external' : 'absent'
    const agyHealth: LettaLinkHealth = agyState === 'other' ? 'foreign'
      : managed?.agy && agyState !== 'linked' ? 'drifted'
      : managed?.agy ? 'linked-managed' : agyState === 'linked' ? 'linked-external' : 'absent'
    const result: ISkillInspection = {
      name, source: item.source, ownership,
      ownershipLabel: ownership === 'installed' ? 'Installed here' : ownership === 'adopted' ? 'Tracked for updates'
        : 'Installed elsewhere',
      fileHealth: 'unknown', fileHealthDetail: 'Not verified', lettaHealth,
      lettaHealthDetail: lettaHealth === 'foreign' ? 'Another item occupies the Letta path'
        : lettaHealth === 'drifted' ? 'The Letta link changed since installation'
          : lettaHealth === 'linked-managed' ? 'Linked by this manager'
            : lettaHealth === 'linked-external' ? 'Existing link remains yours' : 'Not linked to Letta',
      agyHealth,
      agyHealthDetail: agyHealth === 'foreign' ? 'Another item occupies the Agy path'
        : agyHealth === 'drifted' ? 'The Agy link changed since installation'
          : agyHealth === 'linked-managed' ? 'Linked by this manager'
            : agyHealth === 'linked-external' ? 'Existing link remains yours' : 'Not linked to Agy',
      upstream: 'not-checked', primaryAction: 'none', primaryActionLabel: '',
      eligibleSecondaryActions: [], plannedWrites: [],
    }
    const block = (reason: string, health: LocalFileHealth = 'unknown'): ISkillInspection => {
      result.fileHealth = health
      result.fileHealthDetail = reason
      result.primaryActionDisabledReason = reason
      return result
    }
    try { this.assertCanonical(name) } catch { return block('Skill files are missing or not a regular folder', 'missing') }
    if (lettaHealth === 'foreign' || lettaHealth === 'drifted') return block(result.lettaHealthDetail)
    if (agyHealth === 'foreign' || agyHealth === 'drifted') return block(result.agyHealthDetail)
    if (state !== 'other' && agyState !== 'other' && (state === 'absent' || !managed?.agy)) {
      result.eligibleSecondaryActions.push('link')
    }
    if ((managed?.link && state === 'linked') || (managed?.agy && agyState === 'linked')) result.eligibleSecondaryActions.push('unlink')
    if (managed?.ownership === 'adopted' && !managed.link && state !== managed.observedLetta) {
      return block('The existing Letta link changed since it was recorded')
    }
    if (managed?.source) {
      if (!managed.installedHash || hashPath(this.canonical(name)) !== managed.installedHash) {
        return block('Local files changed; save your edits before updating', 'modified')
      }
      result.fileHealth = 'clean'
      result.fileHealthDetail = 'Files match the recorded version'
      if (locked ? locked.source !== managed.source : !managed.historical) return block('Recorded source changed; review it before updating')
      if (locked?.ref) return block('This skill is pinned to a version; update it manually')
    } else if (locked) {
      const source = (locked.source ?? '').match(GITHUB_SOURCE)
      if (locked.sourceType !== 'github' || !source || source[2]?.includes('..') || !locked.skillPath
        || !/^[a-f0-9]{40}$/i.test(locked.skillFolderHash ?? '')) return block('Source cannot be verified for safe updating')
      if (locked.ref) return block('This skill is pinned to a version; update it manually')
      if (gitTreeHash(this.canonical(name)) !== locked.skillFolderHash) {
        return block('Local files differ from the installed version; save your edits before updating', 'modified')
      }
      result.fileHealth = 'clean'
      result.fileHealthDetail = 'Files match the installed version'
    } else if (!sourceUrl) {
      return block('Source needed: paste its GitHub repository or skill-folder URL')
    } else {
      try {
        const matched = await this.verifyRecover(name, sourceUrl)
        result.source = matched.ownerRepo
        result.matchedCommit = matched.commitSha
        result.fileHealth = 'clean'
        result.fileHealthDetail = `Files match an older version (${matched.commitSha.slice(0, 12)})`
        const tree = await this.deps.tree(matched.ownerRepo)
        if (tree.truncated) return block('GitHub returned an incomplete tree; cannot verify the latest version')
        const latest = tree.tree.find((node) => node.path === dirname(matched.skillPath) && node.type === 'tree')?.sha
        if (!latest) return block('Skill folder not found upstream; no automatic migration')
        result.upstream = latest === matched.folderHash ? 'current' : 'available'
      } catch (error) {
        return block(`Could not match this source: ${error instanceof Error ? error.message : String(error)}`)
      }
    }
    if (locked?.source && locked.sourceType === 'github' && locked.skillPath
      && /^[0-9a-f]{40}$/i.test(locked.skillFolderHash ?? '') && result.fileHealth === 'clean'
      && (!managed?.source || locked.source === managed.source)) {
      try {
        if (gitTreeHash(this.canonical(name)) !== locked.skillFolderHash) {
          throw new Error(`Canonical skill differs from official lock: ${name}`)
        }
        this.assertNoForeignLinks(name, agyHealth === 'linked-external')
        result.eligibleSecondaryActions.push('uninstall')
      } catch (error) {
        result.uninstallBlockedReason = error instanceof Error ? error.message : String(error)
      }
    }
    if (result.upstream === 'not-checked') {
      const checked = await this.check(name)
      result.upstream = checked.update
      result.upstreamReason = checked.reason
    }
    if (result.upstream === 'unknown' || result.upstream === 'not-checked') {
      return block(`Cannot verify upstream: ${result.upstreamReason ?? 'no reliable result'}`, result.fileHealth)
    }
    if (result.upstream === 'available') {
      result.primaryAction = managed?.source ? 'update' : locked ? 'adopt-update' : 'recover-update'
      result.primaryActionLabel = 'Update'
      result.plannedWrites = [
        ...(!managed?.source ? [`Remember ${result.source} as this skill's update source (update-only)`] : []),
        `Install the latest ${name} from ${result.source} through the official CLI`,
        'Keep any pre-existing Letta link untouched',
      ]
    } else if (!locked && !managed?.source) {
      result.primaryAction = 'recover-only'
      result.primaryActionLabel = 'Remember source'
      result.plannedWrites = [`Remember ${result.source} as this skill's update source (update-only)`, 'Leave skill files and Letta link untouched']
    }
    return result
  }

  link(name: string): void {
    this.assertWriteRoots()
    this.assertCanonical(name)
    const receipt = this.receipt()
    const state = this.linkState(name)
    const agy = this.agyState(name)
    if (state === 'other') throw new Error(`Letta path already belongs to something else: ${name}`)
    if (agy === 'other') throw new Error(`Agy path already belongs to something else: ${name}`)
    const claimLetta = state === 'absent' || !!receipt.skills[name]?.link
    if (state === 'absent') {
      mkdirSync(this.lettaRoot, { recursive: true })
      symlinkSync(this.canonical(name), this.linkPath(name), 'dir')
    }
    if (agy === 'absent') {
      mkdirSync(this.agyRoot, { recursive: true })
      symlinkSync(this.canonical(name), this.agyLinkPath(name), 'dir')
    }
    receipt.skills[name] = {
      ...receipt.skills[name], source: receipt.skills[name]?.source ?? '', link: claimLetta, agy: true,
    }
    writeReceipt(this.receiptPath, receipt)
  }

  install(source: string, name: string, withLetta = true): void {
    this.assertWriteRoots()
    assertName(name)
    const sourceMatch = source.match(GITHUB_SOURCE)
    if (!sourceMatch || sourceMatch[2]?.includes('..')) {
      throw new Error('Install source must be a GitHub owner/repo or HTTPS GitHub URL')
    }
    if (lstat(this.canonical(name)) || this.receipt().skills[name]) {
      throw new Error(`Canonical skill or receipt already exists: ${name}`)
    }
    if (withLetta && this.linkState(name) !== 'absent') throw new Error(`Letta path already exists: ${name}`)
    if (withLetta && this.agyState(name) !== 'absent') throw new Error(`Agy path already exists: ${name}`)
    this.deps.run(['add', source, '--skill', name, '-g', '-a', 'cline', '-y'], this.home)
    this.assertCanonical(name)
    const lock = this.lock()[name]
    if (!lock?.source) throw new Error(`Official installer did not record provenance for ${name}; inspect before retrying`)
    const receipt = this.receipt()
    receipt.skills[name] = { source: lock.source, ownership: 'installed', link: false, installedHash: hashPath(this.canonical(name)) ?? undefined }
    writeReceipt(this.receiptPath, receipt)
    if (withLetta) this.link(name)
  }

  adopt(name: string): void {
    this.assertWriteRoots()
    this.assertCanonical(name)
    const receipt = this.receipt()
    const existing = receipt.skills[name]
    if (existing && !this.linkOnly(name, existing)) throw new Error(`Skill already recorded by this manager: ${name}`)
    const entry = this.lock()[name]
    const sourceMatch = (entry?.source ?? '').match(GITHUB_SOURCE)
    if (entry?.sourceType !== 'github' || !sourceMatch || sourceMatch[2]?.includes('..')
      || !entry.skillPath || !/^[a-f0-9]{40}$/i.test(entry.skillFolderHash ?? '') || entry.ref) {
      throw new Error(`No supported unpinned GitHub provenance for ${name}; cannot adopt`)
    }
    const state = this.linkState(name)
    if (state === 'other') throw new Error(`Letta path belongs to another target: ${name}`)
    if (gitTreeHash(this.canonical(name)) !== entry.skillFolderHash) {
      throw new Error(`Installed ${name} differs from its official lock tree; preserve local edits before adoption`)
    }
    receipt.skills[name] = {
      source: entry.source!, ownership: 'adopted', link: !!existing?.link, agy: !!existing?.agy,
      observedLetta: existing?.link ? undefined : state,
      installedHash: hashPath(this.canonical(name)) ?? undefined,
    }
    writeReceipt(this.receiptPath, receipt)
  }

  async verifyRecover(name: string, sourceUrl: string): Promise<{ ownerRepo: string; commitSha: string; folderHash: string; skillPath: string; observedLetta: IManagedSkill['letta'] }> {
    this.assertWriteRoots()
    this.assertCanonical(name)
    const existing = this.receipt().skills[name]
    if ((existing && !this.linkOnly(name, existing)) || this.lock()[name]) {
      throw new Error(`Existing receipt or official lock for ${name}; use Adopt instead`)
    }
    const url = sourceUrl.trim()
    const treeUrl = url.match(TREE_URL)
    const slug = url.match(GITHUB_SOURCE)
    if (!slug && (!treeUrl || treeUrl[4] !== name)) {
      throw new Error('Recover needs a GitHub owner/repo or default-branch tree URL ending in skills/<selected-name>')
    }
    const ownerRepo = slug ? `${slug[1]}/${slug[2]}` : `${treeUrl![1]}/${treeUrl![2]}`
    if (treeUrl && treeUrl[3] !== await this.deps.defaultBranch(ownerRepo)) {
      throw new Error('Source tree URL must identify the repository default branch')
    }
    const skillPath = `skills/${name}/SKILL.md`
    const folderPath = dirname(skillPath)
    const state = this.linkState(name)
    if (state === 'other') throw new Error(`Letta path belongs to another target: ${name}`)
    const installedTree = gitTreeHash(this.canonical(name))
    const commits = await this.deps.history(ownerRepo, folderPath)
    if (!Array.isArray(commits) || commits.length > 20 || commits.some((sha) => !/^[0-9a-f]{40}$/i.test(sha))) {
      throw new Error('Untrusted or unbounded upstream history response')
    }
    let matched: string | undefined
    for (const sha of commits) {
      const tree = await this.deps.tree(ownerRepo, sha)
      if (tree.truncated) throw new Error('Upstream GitHub tree is truncated; cannot recover provenance')
      if (tree.tree.find((node) => node.path === folderPath && node.type === 'tree')?.sha === installedTree) {
        matched = sha
        break
      }
    }
    if (!matched) throw new Error(`No exact upstream Git tree match in the last ${commits.length} skill commits for ${name}`)
    if (this.linkState(name) !== state || JSON.stringify(this.receipt().skills[name]) !== JSON.stringify(existing)
      || this.lock()[name] || gitTreeHash(this.canonical(name)) !== installedTree) {
      throw new Error(`Local skill, Letta path, or ownership changed during recovery: ${name}`)
    }
    return { ownerRepo, commitSha: matched, folderHash: installedTree, skillPath, observedLetta: state }
  }

  async recover(name: string, sourceUrl: string): Promise<string> {
    const existing = this.receipt().skills[name]
    const verified = await this.verifyRecover(name, sourceUrl)
    const installedHash = hashPath(this.canonical(name))
    const state = this.linkState(name)
    if (gitTreeHash(this.canonical(name)) !== verified.folderHash || hashPath(this.canonical(name)) !== installedHash
      || state !== verified.observedLetta || JSON.stringify(this.receipt().skills[name]) !== JSON.stringify(existing) || this.lock()[name]) {
      throw new Error(`Local skill, Letta path, or ownership changed during recovery: ${name}`)
    }
    const receipt = this.receipt()
    receipt.skills[name] = {
      source: verified.ownerRepo, ownership: 'adopted', link: !!existing?.link, agy: !!existing?.agy,
      observedLetta: existing?.link ? undefined : state === 'linked' ? 'linked' : 'absent',
      installedHash: installedHash ?? undefined,
      historical: { skillPath: verified.skillPath, folderHash: verified.folderHash, commitSha: verified.commitSha },
    }
    writeReceipt(this.receiptPath, receipt)
    return verified.commitSha
  }

  async update(name: string): Promise<'current' | 'updated'> {
    this.assertWriteRoots()
    assertName(name)
    const managed = this.receipt().skills[name]
    if (!managed?.source) throw new Error(`Not installed by this manager: ${name}`)
    const locked = this.lock()[name]
    if (locked ? locked.source !== managed.source : !managed.historical) {
      throw new Error(`Official source changed or historical provenance missing for ${name}`)
    }
    if (locked?.ref) throw new Error(`Pinned ref requires explicit source review before updating: ${name}`)
    if (managed?.link && this.linkState(name) !== 'linked') throw new Error(`Letta link drifted for ${name}`)
    if (managed?.agy && this.agyState(name) !== 'linked') throw new Error(`Agy link drifted for ${name}`)
    this.assertObservedLetta(name, managed)
    this.assertUnchanged(name, managed)
    const status = await this.check(name)
    if (status.update === 'unknown' || status.update === 'not-checked') throw new Error(`Cannot verify upstream update for ${name}: ${status.reason}`)
    // A network check may take seconds. Never use its result to overwrite files
    // that changed while GitHub was responding, even after a prior inspection.
    if (JSON.stringify(this.receipt().skills[name]) !== JSON.stringify(managed)
      || JSON.stringify(this.lock()[name]) !== JSON.stringify(locked)) {
      throw new Error(`Source or manager record changed during upstream check: ${name}`)
    }
    this.assertWriteRoots()
    this.assertCanonical(name)
    if (managed?.link && this.linkState(name) !== 'linked') throw new Error(`Letta link drifted for ${name}`)
    if (managed?.agy && this.agyState(name) !== 'linked') throw new Error(`Agy link drifted for ${name}`)
    this.assertObservedLetta(name, managed)
    this.assertUnchanged(name, managed)
    if (status.update === 'current') return 'current'
    // `skills update -g` reinvokes `skills add` without an agent target. That can
    // install to unrelated agents. Keep this manager's one-agent ownership.
    this.deps.run(['add', managed.source, '--skill', name, '-g', '-a', 'cline', '-y'], this.home)
    this.assertCanonical(name)
    if (this.lock()[name]?.source !== managed.source) throw new Error(`Official source drifted after update: ${name}`)
    if (managed.link && this.linkState(name) !== 'linked') throw new Error(`Letta link drifted after update: ${name}`)
    if (managed.agy && this.agyState(name) !== 'linked') throw new Error(`Agy link drifted after update: ${name}`)
    this.assertObservedLetta(name, managed)
    const receipt = this.receipt()
    receipt.skills[name] = { ...managed, installedHash: hashPath(this.canonical(name)) ?? undefined, historical: undefined }
    writeReceipt(this.receiptPath, receipt)
    return 'updated'
  }

  uninstall(name: string, options: { includeExistingLinks?: boolean } = {}): void {
    this.assertWriteRoots()
    assertName(name)
    if (process.env.XDG_STATE_HOME) throw new Error('Custom XDG_STATE_HOME is not supported for global uninstall')
    const journalPath = join(this.home, '.agents', `.mahiro-global-uninstall-${name}.json`)
    if (lstat(journalPath)) throw new Error(`An unfinished uninstall journal exists for ${name}; recover it before retrying`)
    const receipt = this.receipt()
    const managed = receipt.skills[name]
    const { raw: lockBefore, value: lock } = this.lockDocument()
    const lockIdentity = identity(lstatSync(this.lockPath))
    const entry = lock.skills[name]
    if (!entry?.source || entry.sourceType !== 'github' || !entry.skillPath
      || !/^[0-9a-f]{40}$/i.test(entry.skillFolderHash ?? '')) {
      throw new Error(`No supported GitHub lock provenance for ${name}; refusing to uninstall`)
    }
    if (managed?.source && managed.source !== entry.source) throw new Error(`Official source changed for ${name}`)
    this.assertCanonical(name)
    if (managed?.link && this.linkState(name) !== 'linked') throw new Error(`Letta link drifted for ${name}`)
    if (managed?.agy && this.agyState(name) !== 'linked') throw new Error(`Agy link drifted for ${name}`)
    if (this.linkState(name) === 'other') throw new Error(`Letta path belongs to another target: ${name}`)
    if (this.agyState(name) === 'other') throw new Error(`Agy path belongs to another target: ${name}`)
    const existingLettaLink = !managed?.link && this.linkState(name) === 'linked'
    const existingAgyLink = !managed?.agy && this.agyState(name) === 'linked'
    if (existingLettaLink && !options.includeExistingLinks) {
      throw new Error(`Unowned existing Letta link for ${name}; confirm its removal explicitly before uninstall`)
    }
    if (existingAgyLink && !options.includeExistingLinks) {
      throw new Error(`Unowned existing Agy link for ${name}; confirm its removal explicitly before uninstall`)
    }
    if (managed?.source && managed.ownership !== 'adopted') this.assertUnchanged(name, managed)
    if (gitTreeHash(this.canonical(name)) !== entry.skillFolderHash) {
      throw new Error(`Canonical skill differs from official lock: ${name}; refusing to remove local changes`)
    }
    this.assertNoForeignLinks(name, existingAgyLink && options.includeExistingLinks)

    const receiptState = lstat(this.receiptPath)
    if (receiptState && (!receiptState.isFile() || receiptState.nlink !== 1)) throw new Error('Manager receipt is not a regular file')
    const receiptIdentity = receiptState ? identity(receiptState) : null
    const receiptBefore = receiptState ? readFileSync(this.receiptPath, 'utf8') : null
    const nextReceipt = managed ? { ...receipt, skills: { ...receipt.skills } } : null
    if (nextReceipt) delete nextReceipt.skills[name]
    const receiptAfter = nextReceipt ? `${JSON.stringify(nextReceipt, null, 2)}\n` : null
    const nextLock: LockDocument = { ...lock, skills: { ...lock.skills } }
    delete nextLock.skills[name]
    const lockAfter = `${JSON.stringify(nextLock, null, 2)}\n`
    const canonical = this.canonical(name)
    const stage = join(this.home, '.agents', `.mahiro-global-uninstall-${name}-${randomUUID()}`)
    const links = [this.linkPath(name), this.agyLinkPath(name)]
      .filter((path) => lstat(path)?.isSymbolicLink())
      .map((path, index) => ({ path, staged: join(stage, `link-${index}`),
        target: readlinkSync(path), identity: identity(lstatSync(path)) }))
    const journal: RemovalJournal = {
      version: 1, name, stage, canonical, canonicalIdentity: identity(lstatSync(canonical)),
      links, lockBefore, lockAfter, receiptBefore, receiptAfter,
    }
    writeFileSync(journalPath, `${JSON.stringify(journal)}\n`, { flag: 'wx', mode: 0o600 })
    let cleanupStarted = false
    try {
      mkdirSync(stage, { mode: 0o700 })
      if (!lstat(this.lockPath)?.isFile() || identity(lstatSync(this.lockPath)) !== lockIdentity
        || readFileSync(this.lockPath, 'utf8') !== lockBefore
        || (receiptBefore !== null && (!lstat(this.receiptPath)?.isFile()
          || identity(lstatSync(this.receiptPath)) !== receiptIdentity
          || readFileSync(this.receiptPath, 'utf8') !== receiptBefore))) {
        throw new Error('Global lock or receipt changed before uninstall; retry after inspecting the concurrent edit')
      }
      if (managed?.source && managed.ownership !== 'adopted') this.assertUnchanged(name, managed)
      if (gitTreeHash(canonical) !== entry.skillFolderHash) throw new Error(`Canonical skill changed before removal: ${name}`)
      this.assertNoForeignLinks(name, existingAgyLink && options.includeExistingLinks)
      renameSync(canonical, join(stage, 'canonical'))
      for (const link of links) {
        if (!lstat(link.path)?.isSymbolicLink() || readlinkSync(link.path) !== link.target) {
          throw new Error(`Link changed during uninstall: ${link.path}`)
        }
        renameSync(link.path, link.staged)
      }
      if (!lstat(this.lockPath)?.isFile() || identity(lstatSync(this.lockPath)) !== lockIdentity
        || readFileSync(this.lockPath, 'utf8') !== lockBefore) throw new Error('Global lock changed during uninstall')
      writeAtomic(this.lockPath, lockAfter)
      if (nextReceipt) {
        if (readFileSync(this.receiptPath, 'utf8') !== receiptBefore) throw new Error('Manager receipt changed during uninstall')
        writeReceipt(this.receiptPath, nextReceipt)
      }
      cleanupStarted = true
      rmSync(stage, { recursive: true })
      unlinkSync(journalPath)
    } catch (error) {
      if (cleanupStarted) throw new Error(`Uninstall needs recovery for ${name}; journal retained at ${journalPath}`, { cause: error })
      try {
        this.recoverUninstall(name)
      } catch (rollbackError) {
        throw new Error(`Uninstall needs recovery for ${name}; journal retained at ${journalPath}: ${String(rollbackError)}`, { cause: error })
      }
      throw error
    }
  }

  recoverUninstall(name: string): void {
    this.assertWriteRoots()
    assertName(name)
    const journalPath = join(this.home, '.agents', `.mahiro-global-uninstall-${name}.json`)
    const state = lstat(journalPath)
    if (!state?.isFile() || state.nlink !== 1) throw new Error(`No regular uninstall journal for ${name}`)
    const journal = readJson(journalPath) as RemovalJournal
    const prefix = join(this.home, '.agents', `.mahiro-global-uninstall-${name}-`)
    if (journal?.version !== 1 || journal.name !== name || typeof journal.stage !== 'string'
      || !journal.stage.startsWith(prefix) || dirname(journal.stage) !== join(this.home, '.agents')
      || journal.canonical !== this.canonical(name)
      || typeof journal.canonicalIdentity !== 'string'
      || !Array.isArray(journal.links) || typeof journal.lockBefore !== 'string'
      || typeof journal.lockAfter !== 'string'
      || !(journal.receiptBefore === null || typeof journal.receiptBefore === 'string')
      || !(journal.receiptAfter === null || typeof journal.receiptAfter === 'string')) {
      throw new Error('Untrusted uninstall journal; refusing recovery')
    }
    const allowedLinks = new Set([this.linkPath(name), this.agyLinkPath(name)])
    if (journal.links.some((link, index) => !allowedLinks.has(link.path)
      || link.staged !== join(journal.stage, `link-${index}`)
      || typeof link.target !== 'string' || typeof link.identity !== 'string')
      || new Set(journal.links.map((link) => link.path)).size !== journal.links.length) {
      throw new Error('Untrusted uninstall link paths; refusing recovery')
    }
    const stagedCanonical = join(journal.stage, 'canonical')
    if (lstat(journal.stage) && !lstat(journal.stage)?.isDirectory()) throw new Error('Uninstall stage changed; refusing recovery')
    const lockState = lstat(this.lockPath)
    if (!lockState?.isFile() || lockState.nlink !== 1) throw new Error('Global lock changed; refusing recovery')
    const currentLock = readFileSync(this.lockPath, 'utf8')
    if (currentLock !== journal.lockBefore && currentLock !== journal.lockAfter) {
      throw new Error('Global lock diverged; refusing automatic rollback')
    }
    const receiptState = lstat(this.receiptPath)
    if (receiptState && (!receiptState.isFile() || receiptState.nlink !== 1)) throw new Error('Manager receipt changed; refusing recovery')
    const currentReceipt = receiptState ? readFileSync(this.receiptPath, 'utf8') : null
    if (currentReceipt !== journal.receiptBefore && currentReceipt !== journal.receiptAfter) {
      throw new Error('Manager receipt diverged; refusing automatic rollback')
    }
    const payload = lstat(stagedCanonical)
    const original = lstat(journal.canonical)
    if ((payload && original) || (!payload && !original)
      || (payload && (!payload.isDirectory() || identity(payload) !== journal.canonicalIdentity))
      || (original && (!original.isDirectory() || identity(original) !== journal.canonicalIdentity))) {
      throw new Error('Canonical payload or path changed; refusing recovery')
    }
    const beforeLock = JSON.parse(journal.lockBefore) as LockDocument
    const expectedHash = beforeLock?.version === 3 && beforeLock.skills?.[name]?.skillFolderHash
    if (!expectedHash || gitTreeHash(payload ? stagedCanonical : journal.canonical) !== expectedHash) {
      throw new Error('Canonical payload no longer matches the official lock; refusing recovery')
    }
    for (const link of journal.links) {
      const staged = lstat(link.staged)
      const current = lstat(link.path)
      if ((staged && current) || (!staged && !current)
        || (staged && (!staged.isSymbolicLink() || identity(staged) !== link.identity || readlinkSync(link.staged) !== link.target))
        || (current && (!current.isSymbolicLink() || identity(current) !== link.identity || readlinkSync(link.path) !== link.target))) {
        throw new Error(`Link payload or path changed; refusing recovery: ${link.path}`)
      }
    }
    if (lstat(journal.stage)) {
      const expected = [payload ? 'canonical' : '', ...journal.links.map((link, i) => lstat(link.staged) ? `link-${i}` : '')].filter(Boolean).sort()
      if (JSON.stringify(readdirSync(journal.stage).sort()) !== JSON.stringify(expected)) {
        throw new Error('Unexpected files in uninstall stage; refusing recovery')
      }
    }
    if (payload) {
      renameSync(stagedCanonical, journal.canonical)
    }
    for (const link of journal.links) {
      if (lstat(link.staged)) renameSync(link.staged, link.path)
    }
    if (currentReceipt === journal.receiptAfter && journal.receiptBefore !== null && currentReceipt !== journal.receiptBefore) {
      writeAtomic(this.receiptPath, journal.receiptBefore)
    }
    if (currentLock === journal.lockAfter) writeAtomic(this.lockPath, journal.lockBefore)
    if (lstat(journal.stage)) {
      if (readdirSync(journal.stage).length) throw new Error('Unexpected files in uninstall stage; refusing cleanup')
      rmdirSync(journal.stage)
    }
    unlinkSync(journalPath)
  }

  unlink(name: string): void {
    this.assertWriteRoots()
    assertName(name)
    const receipt = this.receipt()
    const entry = receipt.skills[name]
    const ownsLetta = !!entry?.link && this.linkState(name) === 'linked'
    const ownsAgy = !!entry?.agy && this.agyState(name) === 'linked'
    if (!ownsLetta && !ownsAgy) throw new Error(`No manager-owned Letta link: ${name}`)
    if (ownsLetta) unlinkSync(this.linkPath(name))
    if (ownsAgy) unlinkSync(this.agyLinkPath(name))
    if (!entry?.source) delete receipt.skills[name]
    else {
      if (ownsLetta) {
        entry.link = false
        if (entry.ownership === 'adopted') entry.observedLetta = 'absent'
      }
      if (ownsAgy) entry.agy = false
    }
    writeReceipt(this.receiptPath, receipt)
  }
}

export const createGlobalSkillManager = (deps: IManagerDependencies, home = homedir()): GlobalSkillManager =>
  new GlobalSkillManager(home, deps)
