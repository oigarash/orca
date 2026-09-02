import { homedir } from 'node:os'
import { basename, join } from 'node:path'

export function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
}

export function timestampMs(value: unknown): number {
  if (typeof value === 'string') {
    const parsed = Date.parse(value)
    return Number.isFinite(parsed) ? parsed : Number.NaN
  }
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return Number.NaN
  }
  return value > 1_000_000_000_000 ? value : value * 1000
}

export function parseJsonObject(line: string): Record<string, unknown> | null {
  if (!line.trim()) {
    return null
  }
  try {
    return asRecord(JSON.parse(line) as unknown)
  } catch {
    return null
  }
}

export function extractString(value: unknown): string | null {
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}

export function normalizeAgentSessionsDir(
  rawValue: string,
  agentHomeDirName: '.pi' | '.omp'
): string {
  const trimmed = rawValue.trim()
  if (!trimmed) {
    return join(homedir(), agentHomeDirName, 'agent', 'sessions')
  }
  const normalized = trimmed.replace(/[\\/]+$/, '')
  const leaf = basename(normalized)
  if (leaf === 'sessions') {
    return normalized
  }
  if (leaf === 'agent') {
    return join(normalized, 'sessions')
  }
  if (leaf === agentHomeDirName) {
    return join(normalized, 'agent', 'sessions')
  }
  return normalized
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}
