#!/usr/bin/env node

import { spawnSync } from 'node:child_process'
import { mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import {
  findWindowsFrameworkCompiler,
  shouldReuseCompiledWindowsHelper
} from './build-windows-cli-launcher.mjs'

function readArg(name) {
  const index = process.argv.indexOf(name)
  return index !== -1 ? process.argv[index + 1] : undefined
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.platform !== 'win32') {
    if (process.argv.includes('--if-windows')) {
      process.exit(0)
    }
    throw new Error(
      'Windows input-method helper compilation requires a Windows host; refusing to package without it.'
    )
  }

  const repoRoot = resolve(import.meta.dirname, '../..')
  const sourcePath = join(repoRoot, 'native', 'input-method-windows', 'OrcaInputMethodState.cs')
  const outputPath =
    readArg('--output') ??
    join(repoRoot, 'native', 'input-method-windows', '.build', 'orca-input-method-state.exe')
  const compilerPath = findWindowsFrameworkCompiler(process.env)
  if (!compilerPath) {
    throw new Error('Unable to find the .NET Framework C# compiler required for IME detection.')
  }

  mkdirSync(dirname(outputPath), { recursive: true })
  if (
    shouldReuseCompiledWindowsHelper(outputPath, sourcePath, {
      reuseCached: process.env.ORCA_REUSE_WINDOWS_INPUT_METHOD_STATE === '1'
    })
  ) {
    console.log(`[native-build] reusing Windows input-method helper at ${outputPath}`)
    process.exit(0)
  }
  const result = spawnSync(
    compilerPath,
    ['/nologo', '/target:exe', '/optimize+', '/warnaserror+', `/out:${outputPath}`, sourcePath],
    { cwd: repoRoot, stdio: 'inherit' }
  )
  if (result.signal) {
    process.kill(process.pid, result.signal)
  }
  if (result.error) {
    throw result.error
  }
  if (result.status !== 0) {
    process.exit(result.status ?? 1)
  }
}
