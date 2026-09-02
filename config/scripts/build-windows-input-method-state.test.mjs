import { mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'
import { describe, expect, it } from 'vitest'

const projectRoot = resolve(import.meta.dirname, '../..')
const itCrossHost = process.platform === 'win32' ? it.skip : it

describe('Windows input-method helper', () => {
  itCrossHost('skips cleanly for the cross-platform dev command', () => {
    const result = spawnSync(
      process.execPath,
      ['config/scripts/build-windows-input-method-state.mjs', '--if-windows'],
      { cwd: projectRoot, encoding: 'utf8' }
    )

    expect(result.status).toBe(0)
  })

  itCrossHost('fails closed when it cannot be compiled on this host', () => {
    const outputRoot = mkdtempSync(join(tmpdir(), 'orca input method helper '))
    try {
      const result = spawnSync(
        process.execPath,
        [
          'config/scripts/build-windows-input-method-state.mjs',
          '--output',
          join(outputRoot, 'state.exe')
        ],
        { cwd: projectRoot, encoding: 'utf8' }
      )
      expect(result.status).not.toBe(0)
      expect(result.stderr).toContain('input-method helper')
      expect(result.stderr).toContain('Windows host')
    } finally {
      rmSync(outputRoot, { recursive: true, force: true })
    }
  })

  it('classifies only an open Japanese IME as active', () => {
    const source = readFileSync(
      join(projectRoot, 'native', 'input-method-windows', 'OrcaInputMethodState.cs'),
      'utf8'
    )
    expect(source).toContain('ImmIsIME')
    expect(source).toContain('ImcGetOpenStatus')
    expect(source).toContain('primaryLanguage == LangJapanese ? "active" : "unknown"')
  })
})
