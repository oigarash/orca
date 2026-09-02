import type { BrowserWindow } from 'electron'
import type { KeyboardLayoutSnapshot } from '../../shared/keyboard-layout-snapshot'
import type { InputMethodState } from '../../shared/input-method-state'
import { readMacKeyboardLayoutSnapshot } from './macos-keyboard-layout-snapshot'
import { readWindowsInputMethodState } from './windows-input-method-state'

type InputMethodStateReadOptions = {
  platform?: NodeJS.Platform
  readMacSnapshot?: () => Promise<KeyboardLayoutSnapshot | null>
  readWindowsState?: (
    window: Pick<BrowserWindow, 'getNativeWindowHandle'> | null
  ) => Promise<InputMethodState>
}

export async function readInputMethodState(
  window: Pick<BrowserWindow, 'getNativeWindowHandle'> | null,
  options: InputMethodStateReadOptions = {}
): Promise<InputMethodState> {
  const platform = options.platform ?? process.platform
  try {
    if (platform === 'darwin') {
      const snapshot = await (options.readMacSnapshot ?? readMacKeyboardLayoutSnapshot)()
      return snapshot?.inputMethodState ?? 'unknown'
    }
    if (platform === 'win32') {
      return await (options.readWindowsState ?? readWindowsInputMethodState)(window)
    }
  } catch {
    return 'unknown'
  }
  return 'unknown'
}
