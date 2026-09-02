/** Environment variables Node and libuv need for process startup. */
export const RUNTIME_ENV_ALLOWLIST = [
  'PATH',
  'HOME',
  'USERPROFILE',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'TZ',
  'TMPDIR',
  'TEMP',
  'TMP',
  'SYSTEMROOT',
  'SYSTEMDRIVE',
  'WINDIR',
  'COMSPEC',
  'PATHEXT',
  'PROCESSOR_ARCHITECTURE',
  'NUMBER_OF_PROCESSORS'
] as const

export function pickAllowedEnv(
  keys: readonly string[],
  baseEnv: NodeJS.ProcessEnv,
  platform: NodeJS.Platform
): NodeJS.ProcessEnv {
  const windowsLookup = new Map<string, string>()
  if (platform === 'win32') {
    // Windows environment names are case-insensitive, unlike POSIX names.
    for (const [key, value] of Object.entries(baseEnv)) {
      if (typeof value === 'string') {
        windowsLookup.set(key.toUpperCase(), value)
      }
    }
  }
  const env: NodeJS.ProcessEnv = {}
  for (const key of keys) {
    const value = platform === 'win32' ? windowsLookup.get(key) : baseEnv[key]
    if (value !== undefined) {
      env[key === 'SYSTEMROOT' ? 'SystemRoot' : key] = value
    }
  }
  return env
}
