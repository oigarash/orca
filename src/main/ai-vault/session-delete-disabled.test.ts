import { describe, expect, it, vi } from 'vitest'

const trashItem = vi.hoisted(() => vi.fn())

vi.mock('electron', () => ({ shell: { trashItem } }))

import { deleteAiVaultSessionFile } from './session-delete'
import { validateAiVaultSessionDeleteTarget } from './session-delete-target'

const localGeminiSession = {
  agent: 'gemini' as const,
  filePath: '/tmp/session.json',
  executionHostId: 'local' as const
}

describe('AI Vault session deletion in disabled builds', () => {
  it('retains no trusted session roots', () => {
    expect(validateAiVaultSessionDeleteTarget(localGeminiSession)).toEqual({
      allowed: false,
      agent: 'gemini',
      reason: 'unsupported-agent'
    })
  })

  it('never sends a path to the trash', async () => {
    await expect(deleteAiVaultSessionFile(localGeminiSession)).resolves.toEqual({
      outcome: 'rejected',
      agent: 'gemini',
      reason: 'unsupported-agent'
    })
    expect(trashItem).not.toHaveBeenCalled()
  })
})
