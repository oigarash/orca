import { app, type BrowserWindow } from 'electron'
import { join } from 'node:path'
import {
  INPUT_METHOD_STATE_CHANGED_CHANNEL,
  isInputMethodState,
  type InputMethodState
} from '../../shared/input-method-state'
import { runProcess, type ProcessResult } from '../../shared/child-process/run-process'

export const WINDOWS_IME_NOTIFY_MESSAGE = 0x0282
export const WINDOWS_IME_SET_OPEN_STATUS = 0x0008

const HELPER_TIMEOUT_MS = 750
const MAX_HELPER_OUTPUT_BYTES = 4096

type InputMethodWindow = Pick<
  BrowserWindow,
  | 'getNativeWindowHandle'
  | 'hookWindowMessage'
  | 'unhookWindowMessage'
  | 'on'
  | 'removeListener'
  | 'isDestroyed'
  | 'webContents'
>

type ReadOptions = {
  isPackaged?: boolean
  appPath?: string
  resourcesPath?: string
  platform?: NodeJS.Platform
  run?: typeof runProcess
}

export function parseWindowsInputMethodState(stdout: string): InputMethodState {
  const value = stdout.trim()
  return isInputMethodState(value) ? value : 'unknown'
}

export function nativeWindowHandleArgument(handle: Buffer): string | null {
  if (handle.length >= 8) {
    return `0x${handle.readBigUInt64LE(0).toString(16)}`
  }
  if (handle.length >= 4) {
    return `0x${handle.readUInt32LE(0).toString(16)}`
  }
  return null
}

export function resolveWindowsInputMethodHelperPath(options: ReadOptions = {}): string {
  const isPackaged = options.isPackaged ?? app.isPackaged
  return isPackaged
    ? join(
        options.resourcesPath ?? process.resourcesPath,
        'input-method',
        'orca-input-method-state.exe'
      )
    : join(
        options.appPath ?? app.getAppPath(),
        'native',
        'input-method-windows',
        '.build',
        'orca-input-method-state.exe'
      )
}

export async function readWindowsInputMethodState(
  window: Pick<BrowserWindow, 'getNativeWindowHandle'> | null,
  options: ReadOptions = {}
): Promise<InputMethodState> {
  if ((options.platform ?? process.platform) !== 'win32' || !window) {
    return 'unknown'
  }
  try {
    const handle = nativeWindowHandleArgument(window.getNativeWindowHandle())
    if (!handle) {
      return 'unknown'
    }
    const result: ProcessResult = await (options.run ?? runProcess)({
      program: resolveWindowsInputMethodHelperPath(options),
      args: [handle],
      timeoutMs: HELPER_TIMEOUT_MS,
      maxOutputBytes: MAX_HELPER_OUTPUT_BYTES
    })
    return result.code === 0 && !result.timedOut
      ? parseWindowsInputMethodState(result.stdout)
      : 'unknown'
  } catch {
    return 'unknown'
  }
}

function messageValue(buffer: Buffer): number | null {
  if (buffer.length >= 4) {
    return buffer.readUInt32LE(0)
  }
  return null
}

export function installWindowsInputMethodStateMonitor(
  window: Partial<InputMethodWindow>,
  options: {
    platform?: NodeJS.Platform
    readState?: () => Promise<InputMethodState>
  } = {}
): () => void {
  if (
    (options.platform ?? process.platform) !== 'win32' ||
    !window.hookWindowMessage ||
    !window.webContents
  ) {
    return () => undefined
  }

  let disposed = false
  let readInFlight = false
  let refreshQueued = false
  const send = (state: InputMethodState): void => {
    try {
      if (!disposed && !window.isDestroyed?.() && !window.webContents?.isDestroyed()) {
        window.webContents?.send(INPUT_METHOD_STATE_CHANGED_CHANNEL, state)
      }
    } catch {
      // The window can close between the liveness check and send.
    }
  }
  const runRefresh = (): void => {
    readInFlight = true
    void Promise.resolve()
      .then(() => options.readState?.() ?? readWindowsInputMethodState(window as InputMethodWindow))
      .catch((): InputMethodState => 'unknown')
      .then((state) => {
        if (!disposed && !refreshQueued) {
          send(state)
        }
      })
      .finally(() => {
        readInFlight = false
        if (!disposed && refreshQueued) {
          refreshQueued = false
          runRefresh()
        }
      })
  }
  const refresh = (): void => {
    if (readInFlight) {
      refreshQueued = true
      return
    }
    runRefresh()
  }
  const onImeNotify = (wParam: Buffer): void => {
    if (messageValue(wParam) === WINDOWS_IME_SET_OPEN_STATUS) {
      refresh()
    }
  }
  const dispose = (): void => {
    if (disposed) {
      return
    }
    disposed = true
    refreshQueued = false
    window.removeListener?.('focus', refresh)
    window.removeListener?.('closed', dispose)
    window.unhookWindowMessage?.(WINDOWS_IME_NOTIFY_MESSAGE)
  }

  window.hookWindowMessage(WINDOWS_IME_NOTIFY_MESSAGE, onImeNotify)
  window.on?.('focus', refresh)
  window.on?.('closed', dispose)
  return dispose
}
