import type { PreloadApi } from '../../../../preload/api-types'
import type {
  AiVaultPrepareSessionResumeArgs,
  AiVaultPrepareSessionResumeResult
} from '../../../../shared/ai-vault-resume-preparation'
import type { AiVaultDeleteSessionArgs } from '../../../../shared/ai-vault-session-deletion'
import type {
  AiVaultSessionTitlesArgs,
  AiVaultSessionTitlesResult
} from '../../../../shared/ai-vault-session-title'
import type { AiVaultListArgs, AiVaultListResult } from '../../../../shared/ai-vault-types'
import type { ExecutionHostId } from '../../../../shared/execution-host'
import { noopUnsubscribe } from './web-storage'
import { translate } from '@/i18n/i18n'

export function createWebAiVaultApi(): NonNullable<Partial<PreloadApi>['aiVault']> {
  return {
    listSessions: (_args?: AiVaultListArgs) => Promise.resolve(webAiVaultDisabledResult()),
    resolveSessionTitles: (_args: AiVaultSessionTitlesArgs) =>
      Promise.resolve({ titles: [] } satisfies AiVaultSessionTitlesResult),
    cancelListSessions: () => Promise.resolve(),
    prepareSessionResume: (_args: AiVaultPrepareSessionResumeArgs) =>
      Promise.resolve({ useRealCodexHome: false } satisfies AiVaultPrepareSessionResumeResult),
    listSubagentSessions: () => Promise.resolve({ sessions: [], issues: [] }),
    getFirstUserPrompt: () => Promise.resolve({ prompt: null }),
    deleteSession: (args: AiVaultDeleteSessionArgs) =>
      Promise.resolve({
        outcome: 'rejected',
        agent: args.agent,
        reason: 'non-local-host' as const
      }),
    onWindowFocused: () => noopUnsubscribe
  }
}

function webAiVaultDisabledResult(): AiVaultListResult {
  return {
    sessions: [],
    issues: [],
    scannedAt: new Date().toISOString()
  }
}

export function webAiVaultUnavailableResult(executionHostId: ExecutionHostId): AiVaultListResult {
  return {
    sessions: [],
    issues: [
      {
        executionHostId,
        agent: 'codex',
        path: executionHostId,
        message: translate(
          'auto.web.webPreloadApi.aiVaultUnavailableForHost',
          'Agent Session History is not available for this execution host.'
        )
      }
    ],
    scannedAt: new Date().toISOString()
  }
}
