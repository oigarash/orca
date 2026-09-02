import type { AiVaultListResult } from '../../shared/ai-vault-types'
import type { AiVaultScanOptions } from './session-scanner-types'

export async function scanAiVaultSessions(
  _options: AiVaultScanOptions = {}
): Promise<AiVaultListResult> {
  return { sessions: [], issues: [], scannedAt: new Date().toISOString() }
}
