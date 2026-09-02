import type {
  AiVaultDeleteSessionArgs,
  AiVaultDeleteSessionResult
} from '../../shared/ai-vault-session-deletion'
import type {
  AiVaultFirstUserPromptArgs,
  AiVaultListArgs,
  AiVaultSubagentListArgs
} from '../../shared/ai-vault-types'
import type { AiVaultSessionTitlesArgs } from '../../shared/ai-vault-session-title'
import type { AiVaultPrepareSessionResumeArgs } from '../../shared/ai-vault-resume-preparation'

export const aiVaultApi = {
  listSessions: (_args?: AiVaultListArgs): Promise<unknown> =>
    Promise.resolve({ sessions: [], issues: [], scannedAt: new Date().toISOString() }),
  resolveSessionTitles: (_args: AiVaultSessionTitlesArgs): Promise<unknown> =>
    Promise.resolve({ titles: [] }),
  cancelListSessions: (_args: { requestToken: string }): Promise<void> => Promise.resolve(),
  prepareSessionResume: (_args: AiVaultPrepareSessionResumeArgs): Promise<unknown> =>
    Promise.resolve({ useRealCodexHome: false }),
  listSubagentSessions: (_args: AiVaultSubagentListArgs): Promise<unknown> =>
    Promise.resolve({ sessions: [], issues: [] }),
  getFirstUserPrompt: (_args: AiVaultFirstUserPromptArgs): Promise<unknown> =>
    Promise.resolve({ prompt: null }),
  deleteSession: (args: AiVaultDeleteSessionArgs): Promise<AiVaultDeleteSessionResult> =>
    Promise.resolve({ outcome: 'rejected', agent: args.agent, reason: 'non-local-host' }),
  onWindowFocused:
    (_callback: () => void): (() => void) =>
    () => {}
}
