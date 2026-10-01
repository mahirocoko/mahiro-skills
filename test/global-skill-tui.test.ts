import { describe, expect, test } from 'bun:test'

import { GlobalSkillTui, type IGlobalSkillTuiManager } from '../src/global-skill-tui'
import type { IManagedSkill, ISkillInspection } from '../src/global-skill-manager'
import type { Terminal, TerminalDataHandler, TerminalResizeHandler } from '../src/terminal'

class FakeTerminal {
  isInteractive = true
  colorEnabled = false
  columns = 90
  rows = 24
  frames: string[] = []
  closed = 0
  entered = 0
  left = 0
  handler?: TerminalDataHandler
  getSize() { return { columns: this.columns, rows: this.rows } }
  write(text: string) { this.frames.push(text) }
  onData(handler: TerminalDataHandler) { this.handler = handler; return () => { this.handler = undefined } }
  onResize(_handler: TerminalResizeHandler) { return () => {} }
  setRawMode() {}
  enterAlternateScreen() { this.entered += 1 }
  leaveAlternateScreen() { this.left += 1 }
  hideCursor() {}
  showCursor() {}
  close() { this.closed += 1 }
}

const item = (name: string, managed = false, source: string | null = 'owner/repo'): IManagedSkill => ({
  name, source, installedByManager: managed, adoptedForUpdate: false, lettaOwned: managed,
  letta: managed ? 'linked' : 'absent', agyOwned: managed, agy: managed ? 'linked' : 'absent', update: 'not-checked',
})

const inspection = (skill: IManagedSkill, action: ISkillInspection['primaryAction'] = 'update'): ISkillInspection => ({
  name: skill.name, source: skill.source,
  ownership: skill.installedByManager ? 'installed' : skill.source ? 'external-locked' : 'external-lockless',
  ownershipLabel: skill.installedByManager ? 'Installed here' : 'Installed elsewhere',
  fileHealth: 'clean', fileHealthDetail: 'Files match the installed version',
  lettaHealth: skill.lettaOwned ? 'linked-managed' : 'absent', lettaHealthDetail: skill.lettaOwned ? 'Linked by this manager' : 'Not linked to Letta',
  agyHealth: skill.agyOwned ? 'linked-managed' : 'absent', agyHealthDetail: skill.agyOwned ? 'Linked by this manager' : 'Not linked to Agy',
  upstream: 'available', primaryAction: action, primaryActionLabel: action === 'none' ? '' : 'Update',
  eligibleSecondaryActions: skill.installedByManager ? ['uninstall', 'unlink'] : skill.source ? ['link', 'uninstall'] : ['link'],
  plannedWrites: ['Remember source if needed', 'Install latest through the official CLI', 'Leave existing Letta links untouched'],
})

const setup = () => {
  const calls: string[] = []
  const items = [item('alpha', true), item('beta')]
  const findings = new Map<string, ISkillInspection>()
  const manager: IGlobalSkillTuiManager = {
    list: () => items,
    inspect: async (name, source) => {
      calls.push(`inspect:${name}${source ? `:${source}` : ''}`)
      return findings.get(name) ?? inspection(items.find((value) => value.name === name)!, source ? 'recover-update' : name === 'beta' ? 'adopt-update' : 'update')
    },
    install: (source, name) => { calls.push(`install:${source}:${name}`) },
    adopt: (name) => { calls.push(`adopt:${name}`); items.find((value) => value.name === name)!.adoptedForUpdate = true },
    recover: async (name, source) => { calls.push(`recover:${name}:${source}`); items.find((value) => value.name === name)!.adoptedForUpdate = true; return 'c'.repeat(40) },
    link: (name) => { calls.push(`link:${name}`) },
    update: async (name) => { calls.push(`update:${name}`); return 'updated' },
    uninstall: (name, options) => { calls.push(`uninstall:${name}:${!!options?.includeExistingLinks}`) },
    unlink: (name) => { calls.push(`unlink:${name}`) },
  }
  const terminal = new FakeTerminal()
  return { calls, items, findings, manager, terminal, tui: new GlobalSkillTui(manager, terminal as unknown as Terminal) }
}

describe('global skill TUI', () => {
  test('list navigation is local; Enter inspects only the selected skill', async () => {
    const { tui, calls, terminal } = setup()
    tui.render()
    expect(terminal.frames.at(-1)).toContain('Enter details · s check all')
    expect(terminal.frames.at(-1)).toContain('l link · x unlink · d remove · q quit')
    expect(terminal.frames.at(-1)).toContain('alpha                     Installed Letta ✓  Agy ✓  Not checked')
    expect(terminal.frames.at(-1)).toContain('beta                      External  Letta —  Agy —  Not checked')
    expect(calls).toEqual([])
    expect(terminal.frames.at(-1)).not.toContain('adopt · r recover')
    await tui.handleInput('\x1b[B')
    await tui.handleInput('\r')
    expect(calls).toEqual(['inspect:beta'])
    expect(terminal.frames.at(-1)).toContain('Enter  Update')
    await tui.handleInput('\x1b')
    await Bun.sleep(135)
    await tui.handleInput('\r')
    expect(calls).toEqual(['inspect:beta'])
  })

  test('one scan checks every skill, streams progress, and caches rows for Enter', async () => {
    const { tui, calls, findings, items, terminal } = setup()
    findings.set('beta', { ...inspection(items[1]!, 'none'), upstream: 'current', primaryActionLabel: '' })
    tui.render()
    await tui.handleInput('j')
    expect(calls).toEqual([])
    await tui.handleInput('s')
    await Bun.sleep(10)
    expect(calls).toEqual(['inspect:alpha', 'inspect:beta'])
    expect(terminal.frames.some((frame) => frame.includes('Checking 1/2: alpha'))).toBe(true)
    expect(terminal.frames.some((frame) => frame.includes('Checking 2/2: beta'))).toBe(true)
    expect(terminal.frames.at(-1)).toContain('Update available')
    expect(terminal.frames.at(-1)).toContain('Up to date')
    expect(terminal.frames.at(-1)).toContain('1 updates · 2/2 checked')
    await tui.handleInput('\r')
    expect(calls).toEqual(['inspect:alpha', 'inspect:beta'])
  })

  test('narrow 72×18 terminal keeps all nine rows and scan controls visible', async () => {
    const { items, manager, terminal } = setup()
    terminal.columns = 72
    terminal.getSize = () => ({ columns: terminal.columns, rows: 18 })
    for (let index = 1; index <= 7; index += 1) items.push(item(`extra-${index}`))
    const tui = new GlobalSkillTui(manager, terminal as unknown as Terminal)
    tui.render()
    expect(terminal.frames.at(-1)).toContain('extra-7')
    expect(terminal.frames.at(-1)).toContain('s check all')
    expect(terminal.frames.at(-1)).toContain('q quit')
    await tui.handleInput('s')
    await Bun.sleep(10)
    expect(terminal.frames.some((frame) => frame.includes('Checking 9/9') && frame.includes('extra-7') && frame.includes('q quit'))).toBe(true)
    expect(terminal.frames.at(-1)).toContain('9/9 checked')
  })

  test('scan checks all rather than only the current search, and an explicit rescan refreshes results', async () => {
    const { tui, calls, findings, items, terminal } = setup()
    await tui.handleInput('/beta\r')
    await tui.handleInput('s')
    await Bun.sleep(10)
    expect(calls).toEqual(['inspect:alpha', 'inspect:beta'])
    expect(terminal.frames.at(-1)).toContain('2/2 checked')
    expect(terminal.frames.at(-1)).toContain('1/2 skills')
    findings.set('beta', { ...inspection(items[1]!, 'none'), upstream: 'current', primaryActionLabel: '' })
    await tui.handleInput('s')
    await Bun.sleep(10)
    expect(calls).toEqual(['inspect:alpha', 'inspect:beta', 'inspect:alpha', 'inspect:beta'])
    expect(terminal.frames.at(-1)).toContain('Up to date')
  })

  test('failed checks are per-row and never hide successful results or trigger mutations', async () => {
    const { tui, calls, manager, terminal } = setup()
    const original = manager.inspect
    manager.inspect = async (name, source) => {
      if (name === 'alpha') { calls.push('inspect:alpha'); throw new Error('offline') }
      return original(name, source)
    }
    await tui.handleInput('s')
    await Bun.sleep(10)
    expect(terminal.frames.at(-1)).toContain('Check failed')
    expect(terminal.frames.at(-1)).toContain('Update available')
    expect(terminal.frames.at(-1)).toContain('1 checks failed')
    expect(calls).toEqual(['inspect:alpha', 'inspect:beta'])
  })

  test('Esc stops a running scan after its current read-only check', async () => {
    const { tui, calls, manager, terminal } = setup()
    let finish!: (result: ISkillInspection) => void
    const pending = new Promise<ISkillInspection>((resolve) => { finish = resolve })
    const original = manager.inspect
    manager.inspect = async (name, source) => {
      if (name === 'alpha') { calls.push('inspect:alpha'); return pending }
      return original(name, source)
    }
    await tui.handleInput('s')
    expect(calls).toEqual(['inspect:alpha'])
    await tui.handleInput('\x1b')
    await Bun.sleep(135)
    finish(inspection(item('alpha', true)))
    await Bun.sleep(10)
    expect(calls).toEqual(['inspect:alpha'])
    expect(terminal.frames.at(-1)).toContain('Stopped 1/2')
  })

  test('q exits during a pending scan without rendering or checking the next skill', async () => {
    const { tui, calls, manager, terminal } = setup()
    let finish!: (result: ISkillInspection) => void
    manager.inspect = async (name) => {
      calls.push(`inspect:${name}`)
      return new Promise<ISkillInspection>((resolve) => { finish = resolve })
    }
    await tui.handleInput('s')
    await tui.handleInput('q')
    const frames = terminal.frames.length
    expect(terminal.closed).toBe(1)
    finish(inspection(item('alpha', true)))
    await Bun.sleep(10)
    expect(calls).toEqual(['inspect:alpha'])
    expect(terminal.frames).toHaveLength(frames)
  })

  test('a validated lockless source remains usable after scanning and returning to its detail', async () => {
    const { tui, calls, items, manager, terminal } = setup()
    items[1]!.source = null
    manager.inspect = async (name, source) => {
      calls.push(`inspect:${name}${source ? `:${source}` : ''}`)
      if (name === 'alpha') return inspection(items[0]!)
      return source
        ? { ...inspection(items[1]!, 'recover-update'), source: 'owner/repo', matchedCommit: 'a'.repeat(40) }
        : { ...inspection(items[1]!, 'none'), primaryActionDisabledReason: 'Source needed' }
    }
    await tui.handleInput('j\r\r')
    await tui.handleInput('owner/repo\r')
    await tui.handleInput('\x1b')
    await Bun.sleep(135)
    await tui.handleInput('s')
    await Bun.sleep(10)
    expect(calls.at(-1)).toBe('inspect:beta:owner/repo')
    expect(terminal.frames.at(-1)).toContain('Update available')
    await tui.handleInput('\r\r')
    expect(terminal.frames.at(-1)).toContain('Source: owner/repo')
    await tui.handleInput('n')
    expect(calls.every((call) => call.startsWith('inspect:'))).toBe(true)
  })

  test('color is optional and never needed to read update state', async () => {
    const { tui, terminal } = setup()
    terminal.colorEnabled = true
    tui.render()
    expect(terminal.frames.at(-1)).toContain('\x1b[1;36mGLOBAL SKILLS')
    expect(terminal.frames.at(-1)).toContain('\x1b[7m› alpha')
    terminal.colorEnabled = false
    await tui.handleInput('\r')
    expect(terminal.frames.at(-1)).not.toMatch(/\x1b\[[\d;]+m/)
    expect(terminal.frames.at(-1)).toContain('New version available')
  })

  test('upstream unknown blocks Update without any confirmation', async () => {
    const { tui, calls, findings, items, terminal } = setup()
    findings.set('alpha', { ...inspection(items[0]!), upstream: 'unknown', upstreamReason: 'GitHub HTTP 403', primaryAction: 'none', primaryActionLabel: '', primaryActionDisabledReason: 'Cannot verify upstream' })
    await tui.handleInput('\r\r')
    expect(calls).toEqual(['inspect:alpha'])
    expect(terminal.frames.at(-1)).toContain('Cannot verify upstream')
    expect(terminal.frames.at(-1)).not.toContain('Confirm all steps')
  })

  test('search and split arrow sequences preserve selection and cache', async () => {
    const { tui, calls, terminal } = setup()
    await tui.handleInput('/beta\r')
    expect(terminal.frames.at(-1)).toContain('1/2 skills')
    await tui.handleInput('\r')
    expect(calls).toEqual(['inspect:beta'])
    await tui.handleInput('\x1b')
    await Bun.sleep(135)
    await tui.handleInput('\x1b')
    await tui.handleInput('[B')
    await tui.handleInput('\r')
    expect(calls).toEqual(['inspect:beta'])
  })

  test('manager-installed Update has one confirmation; cancel makes no changes', async () => {
    const { tui, calls, terminal } = setup()
    await tui.handleInput('\r\r')
    expect(terminal.frames.at(-1)).toContain('Review  /  alpha')
    expect(terminal.frames.at(-1)).toContain('Confirm all steps? y/N')
    expect(calls).toEqual(['inspect:alpha'])
    await tui.handleInput('n')
    expect(calls).toEqual(['inspect:alpha'])
    await tui.handleInput('\r')
    await tui.handleInput('y')
    expect(calls).toEqual(['inspect:alpha', 'update:alpha'])
    expect(terminal.left).toBe(1)
    expect(terminal.entered).toBe(1)
    expect(terminal.frames.at(-1)).toContain('Update completed')
  })

  test('external locked Update tracks source and also offers verified uninstall', async () => {
    const { tui, calls, terminal } = setup()
    await tui.handleInput('j\r\r')
    expect(terminal.frames.at(-1)).toContain('Remember source if needed')
    expect(terminal.frames.at(-1)).toContain('Install latest through the official CLI')
    await tui.handleInput('y')
    expect(calls).toEqual(['inspect:beta', 'adopt:beta', 'update:beta'])
    await tui.handleInput('\r\r')
    expect(terminal.frames.at(-1)).toContain('d remove')
  })

  test('lockless URL is checked read-only before Recover + Update is reviewed', async () => {
    const { tui, calls, items, manager, terminal } = setup()
    items[1]!.source = null
    manager.inspect = async (name, source) => {
      calls.push(`inspect:${name}${source ? `:${source}` : ''}`)
      return source ? { ...inspection(items[1]!, 'recover-update'), source: 'owner/repo' }
        : { ...inspection(items[1]!, 'none'), primaryActionDisabledReason: 'Source needed' }
    }
    await tui.handleInput('j\r\r')
    await tui.handleInput('https://github.com/owner/repo/tree/main/skills/beta\r')
    expect(calls.at(-1)).toBe('inspect:beta:https://github.com/owner/repo/tree/main/skills/beta')
    expect(calls.every((call) => call.startsWith('inspect:'))).toBe(true)
    await tui.handleInput('\r')
    expect(terminal.frames.at(-1)).toContain('Confirm all steps? y/N')
    await tui.handleInput('y')
    expect(calls.slice(-2)).toEqual(['recover:beta:https://github.com/owner/repo/tree/main/skills/beta', 'update:beta'])
  })

  test('recovery URL stays visible across lines at narrow width', async () => {
    const { tui, items, manager, terminal } = setup()
    terminal.columns = 72
    terminal.getSize = () => ({ columns: terminal.columns, rows: 18 })
    items[1]!.source = null
    manager.inspect = async (name, source) => source
      ? { ...inspection(items[1]!, 'recover-update'), source: 'owner/repo' }
      : { ...inspection(items[1]!, 'none'), primaryActionDisabledReason: 'Source needed' }
    await tui.handleInput('j\r\r')
    await tui.handleInput('https://github.com/microsoft/playwright-cli/tree/main/skills/beta\r\r')
    const frame = terminal.frames.at(-1)!
    expect(frame).toContain('Source: https://github.com/microsoft/playwright-cli/tree/main/skill')
    expect(frame).toContain('        eta')
    expect(frame).toContain('Confirm all steps? y/N')
  })

  test('failed replacement URL clears a previous actionable inspection', async () => {
    const { tui, items, manager, calls, terminal } = setup()
    items[1]!.source = null
    manager.inspect = async (name, source) => {
      calls.push(`inspect:${name}${source ? `:${source}` : ''}`)
      if (source === 'bad/repo') throw new Error('Source unavailable')
      return source ? { ...inspection(items[1]!, 'recover-update'), source: 'owner/repo' }
        : { ...inspection(items[1]!, 'none'), primaryActionDisabledReason: 'Source needed' }
    }
    await tui.handleInput('j\r\r')
    await tui.handleInput('owner/repo\r')
    expect(terminal.frames.at(-1)).toContain('Enter  Update')
    await tui.handleInput('s')
    await tui.handleInput('\x7f'.repeat('owner/repo'.length))
    await tui.handleInput('bad/repo\r')
    expect(terminal.frames.at(-1)).toContain('Cannot inspect beta: Source unavailable')
    expect(terminal.frames.at(-1)).not.toContain('Enter  Update')
    await tui.handleInput('\r')
    expect(terminal.frames.at(-1)).not.toContain('Confirm all steps')
    expect(calls.every((call) => call.startsWith('inspect:'))).toBe(true)
  })

  test('an exact current historical match remembers source without installing', async () => {
    const { tui, items, manager, calls, terminal } = setup()
    items[1]!.source = null
    manager.inspect = async (name, source) => {
      calls.push(`inspect:${name}${source ? `:${source}` : ''}`)
      return source ? { ...inspection(items[1]!, 'recover-only'), source: 'owner/repo', upstream: 'current', primaryActionLabel: 'Remember source' }
        : { ...inspection(items[1]!, 'none'), primaryActionDisabledReason: 'Source needed' }
    }
    await tui.handleInput('j\r\r')
    await tui.handleInput('owner/repo\r\r')
    await tui.handleInput('y')
    expect(calls.slice(-1)).toEqual(['recover:beta:owner/repo'])
    expect(calls).not.toContain('update:beta')
    expect(terminal.frames.at(-1)).toContain('Source remembered; skill files unchanged')
  })

  test('failed second step reports successful tracking honestly', async () => {
    const { tui, calls, manager, terminal } = setup()
    manager.update = async (name) => { calls.push(`update:${name}`); throw new Error('Upstream disconnected') }
    await tui.handleInput('j\r\r')
    await tui.handleInput('y')
    expect(calls).toEqual(['inspect:beta', 'adopt:beta', 'update:beta'])
    expect(terminal.frames.at(-1)).toContain('Source remembered, but update stopped')
  })

  test('post-inspection drift fails closed at the authoritative mutation', async () => {
    const { tui, calls, manager, terminal } = setup()
    manager.update = async (name) => { calls.push(`update:${name}`); throw new Error('Canonical skill changed since inspection') }
    await tui.handleInput('\r\r')
    await tui.handleInput('y')
    expect(calls).toEqual(['inspect:alpha', 'update:alpha'])
    expect(terminal.frames.at(-1)).toContain('Blocked: Canonical skill changed')
  })

  test('list remove key reviews the selected manager-installed skill', async () => {
    const { tui, calls, terminal } = setup()
    await tui.handleInput('d')
    expect(calls).toEqual(['inspect:alpha'])
    expect(terminal.frames.at(-1)).toContain('Remove this verified global skill')
    await tui.handleInput('\x1b')
    await Bun.sleep(135)
    await tui.handleInput('\x1b')
    await Bun.sleep(135)
    await tui.handleInput('j')
    await tui.handleInput('d')
    expect(terminal.frames.at(-1)).toContain('Remove this verified global skill')
  })

  test('remove is secondary, confirmed, and manager-owned only', async () => {
    const { tui, calls, terminal } = setup()
    await tui.handleInput('\r')
    expect(terminal.frames.at(-1)).toContain('d remove')
    await tui.handleInput('d')
    expect(calls).toEqual(['inspect:alpha'])
    await tui.handleInput('y')
    expect(calls).toEqual(['inspect:alpha', 'uninstall:alpha:false'])
    expect(terminal.left).toBe(1)
  })

  test('confirms removal of an exact existing Agy link before uninstall', async () => {
    const { tui, calls, findings, items, terminal } = setup()
    findings.set('alpha', {
      ...inspection(items[0]!), agyHealth: 'linked-external', agyHealthDetail: 'Existing link remains yours',
    })
    await tui.handleInput('d')
    expect(terminal.frames.at(-1)).toContain('Remove exact Agy link ~/.gemini/antigravity-cli/skills/alpha')
    expect(calls).toEqual(['inspect:alpha'])
    await tui.handleInput('n')
    expect(calls).toEqual(['inspect:alpha'])
    await tui.handleInput('d')
    await tui.handleInput('y')
    expect(calls).toEqual(['inspect:alpha', 'uninstall:alpha:true'])
  })

  test('external locked skill names both existing links before a single confirmed uninstall', async () => {
    const { tui, calls, findings, items, terminal } = setup()
    terminal.columns = 72
    terminal.rows = 18
    findings.set('beta', {
      ...inspection(items[1]!), lettaHealth: 'linked-external', agyHealth: 'linked-external',
    })
    await tui.handleInput('j')
    await tui.handleInput('d')
    expect(terminal.frames.at(-1)).toContain('Remove exact Letta link ~/.letta/skills/beta')
    expect(terminal.frames.at(-1)).toContain('Remove exact Agy link ~/.gemini/antigravity-cli/skills/beta')
    expect(terminal.frames.at(-1)).toContain('Confirm all steps? y/N')
    expect(calls).toEqual(['inspect:beta'])
    await tui.handleInput('y')
    expect(calls).toEqual(['inspect:beta', 'uninstall:beta:true'])
  })

  test('reports the actual blocker for a manager-installed skill instead of claiming it is external', async () => {
    const { tui, findings, items, terminal } = setup()
    findings.set('alpha', {
      ...inspection(items[0]!), eligibleSecondaryActions: ['unlink'],
      uninstallBlockedReason: 'Another agent links to alpha: /other/skills/alpha',
    })
    await tui.handleInput('d')
    expect(terminal.frames.at(-1)).toContain('Another agent links to alpha')
    expect(terminal.frames.at(-1)).not.toContain('Remove is only for a skill installed here.')
  })

  test('install collects source and name before its only confirmation', async () => {
    const { tui, calls, terminal } = setup()
    await tui.handleInput('iowner/repo\rgood-skill\r')
    expect(calls).toEqual([])
    expect(terminal.frames.at(-1)).toContain('Create a manager-owned Letta link and an Agy link')
    await tui.handleInput('y')
    expect(calls).toEqual(['install:owner/repo:good-skill'])
  })

  test('run requires an interactive terminal and restores it on quit', async () => {
    const { tui, terminal } = setup()
    terminal.isInteractive = false
    await expect(tui.run()).rejects.toThrow('interactive terminal')
    terminal.isInteractive = true
    const running = tui.run()
    await tui.handleInput('\x03')
    await running
    expect(terminal.closed).toBe(1)
  })
})
