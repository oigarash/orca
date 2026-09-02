import { describe, expect, it } from 'vitest'
import { scanAiVaultSessions } from './session-scanner'

describe('AI Vault scanner in disabled builds', () => {
  it('returns no session data', async () => {
    const result = await scanAiVaultSessions()

    expect(result.sessions).toEqual([])
    expect(result.issues).toEqual([])
    expect(Number.isNaN(Date.parse(result.scannedAt))).toBe(false)
  })
})
