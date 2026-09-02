import { fork, type ChildProcess } from 'node:child_process'
import { existsSync } from 'node:fs'
import type { AiVaultListResult, AiVaultSubagentListResult } from '../../shared/ai-vault-types'
import type {
  AiVaultSessionTitleRequest,
  AiVaultSessionTitlesResult
} from '../../shared/ai-vault-session-title'
import {
  pickAllowedEnv,
  RUNTIME_ENV_ALLOWLIST
} from '../../shared/child-process/runtime-environment-allowlist'
import { withSpan } from '../observability/tracer'
import type {
  ReadAiVaultFirstUserPromptArgs,
  ReadAiVaultFirstUserPromptResult
} from './session-first-user-prompt-read'
import { getSessionParseCachePersistenceOptions } from './session-parse-cache-persistence'
import { AiVaultScannerServiceClient } from './session-scanner-service-client'
import { getAiVaultServiceEntryPath } from './session-scanner-service-entry-path'
import { lowerAiVaultServicePriority } from './session-scanner-service-priority'
import type { AiVaultServiceSubagentRequest } from './session-scanner-service-protocol'
import type { AiVaultWorkerScanOptions } from './session-scanner-worker-protocol'

const AI_VAULT_ROOT_ENV_ALLOWLIST = [
  'CODEX_HOME',
  'CLINE_SESSION_DATA_DIR',
  'COPILOT_HOME',
  'DEVIN_HOME',
  'GROK_HOME',
  'KIMI_CODE_HOME',
  'OMP_CODING_AGENT_DIR',
  'OPENCLAW_STATE_DIR',
  'OPENCODE_DB',
  'PI_CODING_AGENT_DIR',
  'PRIME_AGENT_CODING_AGENT_DIR',
  'PRIME_AGENT_CODING_AGENT_SESSION_DIR',
  'PRIME_AGENT_SESSION_DIR',
  'XDG_DATA_HOME'
] as const

function aiVaultServiceForkEnv(
  baseEnv: NodeJS.ProcessEnv = process.env,
  platform: NodeJS.Platform = process.platform
): NodeJS.ProcessEnv {
  const env = pickAllowedEnv(
    [...RUNTIME_ENV_ALLOWLIST, ...AI_VAULT_ROOT_ENV_ALLOWLIST],
    baseEnv,
    platform
  )
  env.ELECTRON_RUN_AS_NODE = '1'
  return env
}

export function spawnAiVaultServiceProcess(): ChildProcess {
  const entryPath = getAiVaultServiceEntryPath()
  if (!existsSync(entryPath)) {
    throw new Error(`AI Vault service entry not found: ${entryPath}`)
  }
  const child = fork(entryPath, [], {
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    execArgv: ['--max-old-space-size=384'],
    env: aiVaultServiceForkEnv(),
    ...(process.platform === 'win32' ? { windowsHide: true } : {})
  })
  lowerAiVaultServicePriority(child.pid)
  child.unref()
  return child
}

let sharedClient: AiVaultScannerServiceClient | null = null

function getSharedClient(): AiVaultScannerServiceClient {
  sharedClient ??= new AiVaultScannerServiceClient({
    processFactory: spawnAiVaultServiceProcess,
    init: { sessionParseCache: getSessionParseCachePersistenceOptions() },
    onStderr: (text) => console.error('[ai-vault-service]', text.trimEnd())
  })
  return sharedClient
}

export function scanAiVaultSessionsInService(
  options: AiVaultWorkerScanOptions,
  signal?: AbortSignal
): Promise<AiVaultListResult> {
  return withSpan('aiVault.scan.service', async (span) => {
    const value = await getSharedClient().request<{
      result: AiVaultListResult
      durationMs: number
    }>({ type: 'request', operation: 'scan', options }, signal)
    span.setAttribute('serviceDurationMs', value.durationMs)
    span.setAttribute('sessions', value.result.sessions.length)
    return value.result
  })
}

export function resolveAiVaultSessionTitlesInService(
  requests: AiVaultSessionTitleRequest[],
  signal?: AbortSignal
): Promise<AiVaultSessionTitlesResult> {
  return getSharedClient().request({ type: 'request', operation: 'titles', requests }, signal)
}

export function listAiVaultSubagentSessionsInService(
  request: AiVaultServiceSubagentRequest,
  signal?: AbortSignal
): Promise<AiVaultSubagentListResult> {
  return getSharedClient().request({ type: 'request', operation: 'subagents', request }, signal)
}

export function readAiVaultFirstUserPromptInService(
  request: ReadAiVaultFirstUserPromptArgs,
  signal?: AbortSignal
): Promise<ReadAiVaultFirstUserPromptResult> {
  return getSharedClient().request({ type: 'request', operation: 'firstPrompt', request }, signal)
}

export function invalidateAiVaultServiceCache(paths: string[]): Promise<void> {
  return sharedClient?.invalidate(paths) ?? Promise.resolve()
}

/** A forced refresh is a deliberate user action, so it reopens the restart circuit. */
export function clearAiVaultServiceRestartCircuit(): void {
  sharedClient?.clearRestartCircuit()
}

export function resetAiVaultScannerServiceForTests(): void {
  sharedClient?.dispose()
  sharedClient = null
}
