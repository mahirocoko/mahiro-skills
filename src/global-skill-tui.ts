import type { GlobalSkillManager, IManagedSkill, ISkillInspection } from './global-skill-manager'
import { canUseFullScreenTerminal, type Terminal, type TerminalData } from './terminal'
import { TuiInputDecoder } from './tui'

type Action = 'install' | 'adopt' | 'recover' | 'link' | 'update' | 'uninstall' | 'unlink'
type Mode = 'list' | 'detail' | 'source' | 'recover-source' | 'name' | 'search' | 'confirm' | 'result'
type Tone = 'brand' | 'muted' | 'selected' | 'current' | 'available' | 'unknown' | 'error'
type Line = { text: string; tone?: Tone }

const toneCode: Record<Tone, string> = {
  brand: '1;36', muted: '2', selected: '7', current: '32',
  available: '33', unknown: '35', error: '1;31',
}

export interface IGlobalSkillTuiManager {
  list(): IManagedSkill[]
  inspect(name: string, sourceUrl?: string): Promise<ISkillInspection>
  install(source: string, name: string): void
  adopt(name: string): void
  recover(name: string, sourceUrl: string): Promise<string>
  link(name: string): void
  update(name: string): Promise<'current' | 'updated'>
  uninstall(name: string, options?: { includeExistingLinks?: boolean }): void
  unlink(name: string): void
}

const safe = (text: string): string => text.replace(/[\x00-\x1f\x7f-\x9f\x1b]/g, ' ').trimEnd()

export class GlobalSkillTui {
  private items: IManagedSkill[] = []
  private inspections = new Map<string, ISkillInspection>()
  private sourceUrls = new Map<string, string>()
  private selection = 0
  private mode: Mode = 'list'
  private steps: Action[] = []
  private review: string[] = []
  private includeExistingLinks = false
  private input = ''
  private source = ''
  private name = ''
  private query = ''
  private message = ''
  private busy = false
  private scanning = false
  private scanCancelled = false
  private scanErrors = new Map<string, string>()
  private stopped = false
  private inputDecoder = new TuiInputDecoder()
  private escapeFlushTimer?: ReturnType<typeof setTimeout>
  private inputQueue: Promise<void> = Promise.resolve()
  private done?: () => void
  private unsubscribe?: () => void
  private unsubscribeResize?: () => void

  constructor(private readonly manager: IGlobalSkillTuiManager, private readonly terminal: Terminal) {
    this.refresh()
  }

  private refresh(): void {
    this.items = this.manager.list()
    this.selection = Math.min(this.selection, Math.max(0, this.visible().length - 1))
  }

  private visible(): IManagedSkill[] { return this.items.filter((item) => item.name.toLowerCase().includes(this.query.toLowerCase())) }
  private selected(): IManagedSkill | undefined { return this.visible()[this.selection] }

  private listStatus(item: IManagedSkill): string {
    const checked = this.inspections.get(item.name)
    if (!checked) return this.scanErrors.has(item.name) ? 'Check failed' : item.source ? 'Not checked' : 'Needs source'
    if (checked.fileHealth === 'modified') return 'Local edits'
    if (checked.lettaHealth === 'foreign' || checked.lettaHealth === 'drifted' || checked.agyHealth === 'foreign' || checked.agyHealth === 'drifted') return 'Link conflict'
    if (checked.primaryAction === 'recover-only') return 'Source verified'
    if (checked.primaryAction !== 'none') return 'Update available'
    if (checked.upstream === 'current') return 'Up to date'
    if (checked.primaryActionDisabledReason?.startsWith('Source needed')) return 'Needs source'
    return checked.upstream === 'unknown' ? 'Check failed' : 'Blocked'
  }

  private addWrapped(lines: Line[], label: string, value: string, width: number, tone?: Tone): void {
    const prefix = `${label}: `
    const span = Math.max(1, width - prefix.length)
    for (let i = 0; i < value.length || i === 0; i += span) {
      lines.push({ text: `${i ? ' '.repeat(prefix.length) : prefix}${value.slice(i, i + span)}`, tone })
    }
  }

  render(): void {
    const { columns, rows } = this.terminal.getSize()
    const width = Math.max(30, columns - 2)
    const lines: Line[] = [
      { text: 'GLOBAL SKILLS', tone: 'brand' },
      { text: '─'.repeat(Math.min(width, 85)), tone: 'muted' },
    ]
    if (this.mode === 'list' || this.mode === 'search' || this.mode === 'source' || this.mode === 'name') {
      lines.push(
        { text: `${this.visible().length}/${this.items.length} skills · ↑↓ move · Enter details · s check all`, tone: 'muted' },
        { text: '/ search · i install · l link · x unlink · d remove · q quit', tone: 'muted' },
        { text: '' },
      )
      const inputOpen = this.mode === 'search' || this.mode === 'source' || this.mode === 'name'
      const reserved = 6 + (this.message ? 1 : 0) + (this.busy ? 1 : 0) + (inputOpen ? 1 : 0)
      const available = Math.max(1, rows - reserved)
      const visible = this.visible()
      const start = Math.max(0, Math.min(this.selection - Math.floor(available / 2), visible.length - available))
      for (const [offset, item] of visible.slice(start, start + available).entries()) {
        const checked = this.inspections.get(item.name)
        const status = this.listStatus(item)
        const owner = item.installedByManager ? 'Installed' : item.adoptedForUpdate ? 'Tracked' : 'External'
        const letta = item.letta === 'linked' ? 'Letta ✓' : item.letta === 'other' ? 'Letta ?' : 'Letta —'
        const agy = item.agy === 'linked' ? 'Agy ✓' : item.agy === 'other' ? 'Agy ?' : 'Agy —'
        const nameWidth = Math.max(12, Math.min(25, width - 55))
        const name = item.name.length > nameWidth ? `${item.name.slice(0, nameWidth - 1)}…` : item.name.padEnd(nameWidth)
        lines.push({
          text: `${start + offset === this.selection ? '›' : ' '} ${name} ${owner.padEnd(9)} ${letta.padEnd(8)} ${agy.padEnd(6)} ${status}`,
          tone: start + offset === this.selection ? 'selected' : status === 'Update available' ? 'available'
            : status === 'Up to date' ? 'current' : checked?.upstream === 'unknown' || this.scanErrors.has(item.name) ? 'unknown' : undefined,
        })
      }
      if (!visible.length) lines.push({ text: this.query ? 'No matching skills. Press / to change search.' : 'No global skills found. Press i to install.', tone: 'muted' })
      const checkedCount = this.items.filter((item) => this.inspections.has(item.name) || this.scanErrors.has(item.name)).length
      const updates = this.items.filter((item) => this.listStatus(item) === 'Update available').length
      lines.push({ text: checkedCount ? `${updates} updates · ${checkedCount}/${this.items.length} checked · s refresh all` : 'Update status not checked · s check all', tone: 'muted' })
      if (this.mode === 'search') lines.push({ text: `Search: ${this.input}▌`, tone: 'brand' })
      if (this.mode === 'source') lines.push({ text: `GitHub repo or URL: ${this.input}▌`, tone: 'brand' })
      if (this.mode === 'name') lines.push({ text: `Skill name from ${this.source}: ${this.input}▌`, tone: 'brand' })
    } else if (this.mode === 'detail' || this.mode === 'recover-source') {
      const item = this.selected()
      const inspection = item && this.inspections.get(item.name)
      lines.push({ text: `← Esc back  ·  ${item?.name ?? this.name}`, tone: 'muted' }, { text: '' })
      if (inspection) {
        this.addWrapped(lines, 'Source', inspection.source ?? 'Not recorded', width)
        lines.push(
          { text: `Installed: ${inspection.ownershipLabel}` },
          { text: `Files: ${inspection.fileHealthDetail}`, tone: inspection.fileHealth === 'modified' ? 'error' : undefined },
          { text: `Upstream: ${inspection.upstream === 'available' ? 'New version available' : inspection.upstream === 'current' ? 'Up to date' : inspection.upstreamReason ?? 'Not verified'}` },
          { text: `Letta: ${inspection.lettaHealthDetail}` },
          { text: `Agy: ${inspection.agyHealthDetail}` },
          { text: '' },
        )
        if (inspection.primaryAction !== 'none') lines.push({ text: `Enter  ${inspection.primaryActionLabel}`, tone: 'available' })
        else if (inspection.ownership === 'external-lockless' && inspection.lettaHealth !== 'foreign') {
          lines.push({ text: 'Enter  Provide or change GitHub source URL', tone: 'available' })
        } else lines.push({ text: inspection.primaryActionDisabledReason ?? 'Nothing to update', tone: inspection.primaryActionDisabledReason ? 'error' : 'muted' })
        if (inspection.ownership === 'external-lockless' && inspection.primaryAction !== 'none') {
          lines.push({ text: 's change source URL', tone: 'muted' })
        }
        const secondary = inspection.eligibleSecondaryActions.map((action) => ({ link: 'l link Letta and Agy', unlink: 'x unlink', uninstall: 'd remove' })[action])
        if (secondary.length) lines.push({ text: secondary.join(' · '), tone: 'muted' })
      }
      if (this.mode === 'recover-source') {
        lines.push({ text: 'Paste the GitHub repo or skill-folder URL; Enter checks it without changes.', tone: 'muted' })
        this.addWrapped(lines, 'URL', `${this.input}▌`, width, 'brand')
      }
    } else if (this.mode === 'confirm') {
      lines.push({ text: `Review  /  ${this.name}`, tone: 'brand' }, { text: '' })
      for (const step of this.review) this.addWrapped(lines, '•', step, width)
      if (this.source) this.addWrapped(lines, 'Source', this.source, width, 'muted')
      lines.push({ text: '', tone: 'muted' }, { text: 'Confirm all steps? y/N  ·  Esc cancel', tone: 'available' })
    } else {
      lines.push({ text: 'Result', tone: 'brand' }, { text: '' }, { text: this.message }, { text: '' }, { text: 'Enter  Back to skills  ·  q quit', tone: 'muted' })
    }
    if (this.mode !== 'result' && this.message) lines.push({ text: `Status: ${this.message}`, tone: this.message.startsWith('Cannot') || this.message.startsWith('Blocked') ? 'error' : 'muted' })
    if (this.busy) lines.push({ text: this.scanning ? 'Checking… Esc stops after this check · q quit' : 'Working… no other keys are accepted.', tone: 'available' })
    this.terminal.write(`\x1b[H\x1b[2J${lines.slice(0, rows).map(({ text, tone }) => {
      const content = safe(text).slice(0, width)
      return tone && this.terminal.colorEnabled ? `\x1b[${toneCode[tone]}m${content}\x1b[0m` : content
    }).join('\n')}`)
  }

  private async inspect(name: string, sourceUrl?: string, openDetail = true): Promise<ISkillInspection | undefined> {
    if (!sourceUrl && this.inspections.has(name)) {
      if (openDetail) this.mode = 'detail'
      this.render()
      return this.inspections.get(name)
    }
    if (sourceUrl) { this.inspections.delete(name); this.sourceUrls.delete(name) }
    this.busy = true
    if (openDetail) this.mode = 'detail'
    this.message = `Checking ${name}…`
    this.render()
    try {
      const result = await this.manager.inspect(name, sourceUrl)
      this.inspections.set(name, result)
      this.scanErrors.delete(name)
      if (sourceUrl && result.matchedCommit) this.sourceUrls.set(name, sourceUrl)
      this.message = ''
      return result
    } catch (error) {
      this.message = `Cannot inspect ${name}: ${safe(error instanceof Error ? error.message : String(error))}`
      return undefined
    } finally {
      this.busy = false
      this.render()
    }
  }

  private async offerSecondary(action: 'link' | 'unlink' | 'uninstall'): Promise<void> {
    const item = this.selected()
    if (!item) { this.message = 'No skill selected.'; this.render(); return }
    this.name = item.name
    const inspection = this.inspections.get(item.name) ?? await this.inspect(item.name, undefined, false)
    if (!inspection) return
    if (!inspection.eligibleSecondaryActions.includes(action)) {
      this.message = action === 'uninstall'
        ? `Cannot remove ${item.name}: ${safe(inspection.uninstallBlockedReason ?? inspection.primaryActionDisabledReason ?? 'a verified official lock and unchanged files are required')}`
        : action === 'unlink' ? 'No manager-owned link to remove.' : 'Link is not available for this skill.'
      this.render()
      return
    }
    const details = action === 'uninstall'
      ? ['Remove this verified global skill and its official lock entry',
        ...(inspection.lettaHealth === 'linked-managed' || inspection.agyHealth === 'linked-managed'
          ? ['Remove its manager-owned Letta and Agy links'] : []),
        ...(inspection.lettaHealth === 'linked-external' ? [`Remove exact Letta link ~/.letta/skills/${inspection.name}`] : []),
        ...(inspection.agyHealth === 'linked-external' ? [`Remove exact Agy link ~/.gemini/antigravity-cli/skills/${inspection.name}`] : [])]
      : [action === 'link' ? 'Create manager-owned Letta and Agy links without changing skill files' : 'Remove the manager-owned Letta and Agy links']
    this.confirm([action], inspection.name, details, '', action === 'uninstall'
      && (inspection.lettaHealth === 'linked-external' || inspection.agyHealth === 'linked-external'))
  }

  private async scanAll(): Promise<void> {
    const names = this.items.map((item) => item.name)
    if (!names.length) { this.message = 'No skills to check.'; this.render(); return }
    this.busy = true
    this.scanning = true
    this.scanCancelled = false
    let checked = 0
    try {
      for (const name of names) {
        if (this.scanCancelled || this.stopped) break
        this.message = `Checking ${checked + 1}/${names.length}: ${name} · Esc stops after this check`
        this.inspections.delete(name)
        this.scanErrors.delete(name)
        this.render()
        try {
          const item = this.items.find((value) => value.name === name)
          const sourceUrl = item?.source ? undefined : this.sourceUrls.get(name)
          const result = await this.manager.inspect(name, sourceUrl)
          if (!this.stopped) this.inspections.set(name, result)
        } catch (error) {
          if (!this.stopped) this.scanErrors.set(name, safe(error instanceof Error ? error.message : String(error)))
        }
        checked += 1
        if (!this.stopped) this.render()
      }
    } finally {
      this.busy = false
      this.scanning = false
      if (!this.stopped) {
        const updates = this.items.filter((item) => this.listStatus(item) === 'Update available').length
        this.message = `${this.scanCancelled ? 'Stopped' : 'Checked'} ${checked}/${names.length} · ${updates} updates available${this.scanErrors.size ? ` · ${this.scanErrors.size} checks failed` : ''}`
        this.render()
      }
    }
  }

  private confirm(steps: Action[], name: string, details: string[], source = '', includeExistingLinks = false): void {
    this.steps = steps
    this.name = name
    this.review = details
    this.source = source
    this.includeExistingLinks = includeExistingLinks
    this.mode = 'confirm'
    this.message = ''
    this.render()
  }

  private preparePrimary(inspection: ISkillInspection): void {
    if (inspection.primaryAction === 'none') return
    const steps: Action[] = inspection.primaryAction === 'update' ? ['update']
      : inspection.primaryAction === 'adopt-update' ? ['adopt', 'update']
        : inspection.primaryAction === 'recover-only' ? ['recover'] : ['recover', 'update']
    this.confirm(steps, inspection.name, inspection.plannedWrites, steps.includes('recover') ? this.source : '')
  }

  private async execute(): Promise<void> {
    this.busy = true
    this.render()
    await new Promise<void>((resolve) => setTimeout(resolve, 0))
    const completed: Action[] = []
    let alreadyCurrent = false
    try {
      for (const action of this.steps) {
        const official = action === 'install' || action === 'update' || action === 'uninstall'
        if (official) this.terminal.leaveAlternateScreen()
        try {
          switch (action) {
            case 'install': this.manager.install(this.source, this.name); break
            case 'adopt': this.manager.adopt(this.name); break
            case 'recover': await this.manager.recover(this.name, this.source); break
            case 'link': this.manager.link(this.name); break
            case 'update': alreadyCurrent = await this.manager.update(this.name) === 'current'; break
            case 'uninstall': this.manager.uninstall(this.name, { includeExistingLinks: this.includeExistingLinks }); break
            case 'unlink': this.manager.unlink(this.name); break
          }
          completed.push(action)
        } finally { if (official) this.terminal.enterAlternateScreen() }
      }
      this.message = `${this.name}: ${alreadyCurrent ? 'Already up to date' : this.steps.includes('update') ? 'Update completed' : this.steps.includes('install') ? 'Installed' : this.steps.includes('recover') ? 'Source remembered; skill files unchanged' : 'Done'}.`
    } catch (error) {
      const reason = safe(error instanceof Error ? error.message : String(error))
      this.message = completed.includes('adopt') || completed.includes('recover')
        ? `${this.name}: Source remembered, but update stopped: ${reason}` : `Blocked: ${reason}`
    } finally {
      if (completed.length) {
        this.inspections.delete(this.name)
        this.scanErrors.delete(this.name)
        this.sourceUrls.delete(this.name)
      }
      this.refresh()
      this.busy = false
      this.mode = 'result'
      this.render()
    }
  }

  async handleInput(data: TerminalData): Promise<void> {
    if (this.stopped) return
    if (this.escapeFlushTimer) {
      clearTimeout(this.escapeFlushTimer)
      this.escapeFlushTimer = undefined
    }
    await this.handleKeys(this.inputDecoder.push(data))
    if (this.inputDecoder.hasPending() && !this.stopped) {
      this.escapeFlushTimer = setTimeout(() => {
        this.escapeFlushTimer = undefined
        this.inputQueue = this.inputQueue
          .then(() => this.handleKeys(this.inputDecoder.flush()))
          .catch((error: unknown) => this.showInputError(error))
      }, 120)
    }
  }

  private async handleKeys(keys: ReturnType<TuiInputDecoder['push']>): Promise<void> {
    for (const key of keys) {
      const text = key.type === 'text' ? key.value : ({
        'ctrl-c': '\x03', escape: '\x1b', up: '\x1b[A', down: '\x1b[B',
        enter: '\r', backspace: '\x7f', space: ' ',
      } as Record<string, string>)[key.name]
      if (text) await this.handleKey(text)
      if (this.stopped) break
    }
  }

  private showInputError(error: unknown): void {
    this.message = `Input error: ${safe(error instanceof Error ? error.message : String(error))}`
    this.render()
  }

  private async handleKey(text: string): Promise<void> {
    if (this.scanning) {
      if (text === '\x1b') { this.scanCancelled = true; this.message = 'Stopping after the current check…'; this.render() }
      else if (text === 'q' || text.includes('\x03')) { this.scanCancelled = true; this.stop() }
      return
    }
    if (this.busy) return
    if (text.includes('\x03')) { this.stop(); return }
    if (this.mode === 'confirm') {
      if (text.toLowerCase() === 'y') await this.execute()
      else { this.mode = this.steps.includes('install') ? 'list' : 'detail'; this.message = 'Cancelled; nothing changed.'; this.render() }
      return
    }
    if (this.mode === 'result') {
      if (text === 'q') this.stop()
      else if (text === '\r' || text === '\n' || text === '\x1b') { this.mode = 'list'; this.message = ''; this.render() }
      return
    }
    if (this.mode === 'source' || this.mode === 'recover-source' || this.mode === 'name' || this.mode === 'search') {
      if (text === '\x1b') { this.mode = this.mode === 'recover-source' ? 'detail' : 'list'; this.input = ''; this.render(); return }
      if (text === '\x7f' || text === '\b') this.input = this.input.slice(0, -1)
      else if (text === '\r' || text === '\n') {
        if (this.mode === 'search') {
          this.query = this.input.trim(); this.input = ''; this.mode = 'list'; this.selection = 0; this.render(); return
        }
        if (!this.input.trim()) { this.message = 'Input cannot be empty.'; this.render(); return }
        if (this.mode === 'source') { this.source = this.input.trim(); this.input = ''; this.mode = 'name' }
        else if (this.mode === 'recover-source') {
          this.source = this.input.trim(); this.input = ''; await this.inspect(this.name, this.source); return
        } else {
          const name = this.input.trim(); this.input = ''
          this.confirm(['install'], name, [`Install ${name} from ${this.source} through the official CLI`, 'Create a manager-owned Letta link and an Agy link'], this.source)
          return
        }
      } else if (/^[\x20-\x7e]+$/.test(text) && this.input.length + text.length <= 240) this.input += text
      this.render()
      return
    }
    if (this.mode === 'detail') {
      const inspection = this.selected() && this.inspections.get(this.selected()!.name)
      if (text === '\x1b') { this.mode = 'list'; this.message = ''; this.render(); return }
      if (text === 'q') { this.stop(); return }
      if (!inspection) {
        if (text === '\r' || text === '\n') { this.mode = 'recover-source'; this.input = this.source; this.message = 'Enter a source URL to check again.' }
        this.render()
        return
      }
      if (text === 's' && inspection.ownership === 'external-lockless') {
        this.name = inspection.name; this.input = this.source; this.mode = 'recover-source'; this.message = ''; this.render(); return
      }
      if (text === '\r' || text === '\n') {
        if (inspection.primaryAction !== 'none') this.preparePrimary(inspection)
        else if (inspection.ownership === 'external-lockless' && inspection.lettaHealth !== 'foreign') {
          this.name = inspection.name; this.input = this.source; this.mode = 'recover-source'; this.message = ''
        }
      } else {
        const action = ({ l: 'link', x: 'unlink', d: 'uninstall' } as const)[text as 'l' | 'x' | 'd']
        if (action) { await this.offerSecondary(action); return }
      }
      this.render()
      return
    }
    if (text === 'q') { this.stop(); return }
    if (text === '\x1b') {
      if (this.query) { this.query = ''; this.selection = 0 }
      else this.message = 'Use ↑/↓ to select, Enter to open, q to quit.'
    } else if (text === '\x1b[A' || text === 'k') this.selection = Math.max(0, this.selection - 1)
    else if (text === '\x1b[B' || text === 'j') this.selection = Math.min(Math.max(0, this.visible().length - 1), this.selection + 1)
    else if (text === '/') { this.mode = 'search'; this.input = this.query; this.message = 'Type a skill name; Enter applies, Esc cancels.' }
    else if (text === 's') {
      // Do not block the input queue while upstream requests are in flight.
      void this.scanAll().catch((error: unknown) => this.showInputError(error))
      return
    }
    else if (text === 'i') { this.mode = 'source'; this.input = ''; this.message = 'Enter the GitHub source to install; Esc cancels.' }
    else if (text === 'l' || text === 'x' || text === 'd') {
      await this.offerSecondary(({ l: 'link', x: 'unlink', d: 'uninstall' } as const)[text])
      return
    }
    else if (text === '\r' || text === '\n') {
      const item = this.selected()
      if (item) { this.name = item.name; this.source = this.sourceUrls.get(item.name) ?? ''; await this.inspect(item.name); return }
    }
    this.render()
  }

  stop(): void {
    if (this.stopped) return
    this.stopped = true
    if (this.escapeFlushTimer) clearTimeout(this.escapeFlushTimer)
    this.unsubscribe?.()
    this.unsubscribeResize?.()
    this.terminal.close()
    this.done?.()
  }

  async run(): Promise<void> {
    if (!canUseFullScreenTerminal(this.terminal)) throw new Error('Global skills TUI requires an interactive terminal at least 72x18')
    this.terminal.enterAlternateScreen()
    this.unsubscribe = this.terminal.onData((data) => {
      this.inputQueue = this.inputQueue
        .then(() => this.handleInput(data))
        .catch((error: unknown) => this.showInputError(error))
    })
    this.unsubscribeResize = this.terminal.onResize(() => this.render())
    this.render()
    await new Promise<void>((resolve) => { this.done = resolve })
  }
}

export const createGlobalSkillTui = (manager: GlobalSkillManager, terminal: Terminal): GlobalSkillTui =>
  new GlobalSkillTui(manager, terminal)
