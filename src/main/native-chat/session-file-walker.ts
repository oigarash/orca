import type { Dirent } from 'node:fs'
import { extname, join } from 'node:path'
import { wslGatedReaddir } from './wsl-transcript-fs-access'
import { WslTranscriptFsError } from './wsl-transcript-fs-gate'

export async function walkSessionFiles(
  dirPath: string,
  _agent: unknown,
  _issues: unknown[],
  options: {
    extensions: Set<string>
    filePredicate?: (path: string) => boolean
    directoryPredicate?: (name: string, depth: number) => boolean
    readDirectory?: (dirPath: string) => Promise<Dirent[]>
    signal?: AbortSignal
  },
  depth = 0
): Promise<string[]> {
  options.signal?.throwIfAborted()
  let entries: Dirent[]
  try {
    entries = options.readDirectory
      ? await options.readDirectory(dirPath)
      : await wslGatedReaddir(dirPath, 'scan', options.signal)
  } catch (error) {
    options.signal?.throwIfAborted()
    if (error instanceof WslTranscriptFsError) {
      throw error
    }
    return []
  }

  const files: string[] = []
  for (const entry of entries) {
    options.signal?.throwIfAborted()
    const fullPath = join(dirPath, entry.name)
    if (entry.isDirectory()) {
      if (options.directoryPredicate?.(entry.name, depth) ?? true) {
        files.push(...(await walkSessionFiles(fullPath, _agent, _issues, options, depth + 1)))
      }
      continue
    }
    if (
      entry.isFile() &&
      options.extensions.has(extname(entry.name).toLowerCase()) &&
      (options.filePredicate?.(fullPath) ?? true)
    ) {
      files.push(fullPath)
    }
  }
  return files
}
