import { fork, type ChildProcess } from 'node:child_process'
import { join } from 'node:path'
import {
  pickAllowedEnv,
  RUNTIME_ENV_ALLOWLIST
} from '../shared/child-process/runtime-environment-allowlist'
import { lowerAiVaultServicePriority } from '../main/ai-vault/session-scanner-service-priority'

export function relayAiVaultServiceEntryPath(baseDir = __dirname): string {
  return join(baseDir, 'relay-ai-vault-service.js')
}

export function spawnRelayAiVaultService(): ChildProcess {
  const child = fork(relayAiVaultServiceEntryPath(), [], {
    stdio: ['ignore', 'ignore', 'pipe', 'ipc'],
    execArgv: ['--max-old-space-size=384'],
    env: pickAllowedEnv(RUNTIME_ENV_ALLOWLIST, process.env, process.platform),
    ...(process.platform === 'win32' ? { windowsHide: true } : {})
  })
  lowerAiVaultServicePriority(child.pid)
  child.unref()
  return child
}
