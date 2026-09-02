import { app, BrowserWindow, systemPreferences } from 'electron'
import {
  KEYBOARD_LAYOUT_CHANGED_CHANNEL,
  type KeyboardLayoutChangeEvent
} from '../../shared/keyboard-layout-events'
import { INPUT_METHOD_STATE_CHANGED_CHANNEL } from '../../shared/input-method-state'
import {
  readMacKeyboardLayoutSnapshot,
  waitForMacKeyboardLayoutSnapshotIdle
} from './macos-keyboard-layout-snapshot'

const INPUT_SOURCE_CHANGED_NOTIFICATION =
  'com.apple.Carbon.TISNotifySelectedKeyboardInputSourceChanged'

export function registerMacKeyboardLayoutChangeNotifications(): () => void {
  if (process.platform !== 'darwin') {
    return () => undefined
  }

  let disposed = false
  let subscriptionId: number
  let generation = 0
  const broadcast = (channel: string, value: KeyboardLayoutChangeEvent | string): void => {
    for (const window of BrowserWindow.getAllWindows()) {
      try {
        if (!window.isDestroyed() && !window.webContents.isDestroyed()) {
          window.webContents.send(channel, value)
        }
      } catch {
        // The window can close between the liveness check and send.
      }
    }
  }
  const refreshAfterCurrentRead = async (nextGeneration: number): Promise<void> => {
    await waitForMacKeyboardLayoutSnapshotIdle()
    if (disposed || nextGeneration !== generation) {
      return
    }
    const snapshot = await readMacKeyboardLayoutSnapshot()
    if (!disposed && nextGeneration === generation) {
      broadcast(INPUT_METHOD_STATE_CHANGED_CHANNEL, snapshot?.inputMethodState ?? 'unknown')
      broadcast(KEYBOARD_LAYOUT_CHANGED_CHANNEL, {
        phase: 'refresh',
        generation: nextGeneration
      })
    }
  }

  try {
    subscriptionId = systemPreferences.subscribeNotification(
      INPUT_SOURCE_CHANGED_NOTIFICATION,
      () => {
        if (disposed) {
          return
        }
        const nextGeneration = ++generation
        broadcast(KEYBOARD_LAYOUT_CHANGED_CHANNEL, {
          phase: 'invalidated',
          generation: nextGeneration
        })
        void refreshAfterCurrentRead(nextGeneration)
      }
    )
  } catch {
    return () => undefined
  }

  const dispose = (): void => {
    if (disposed) {
      return
    }
    disposed = true
    app.removeListener('will-quit', dispose)
    try {
      systemPreferences.unsubscribeNotification(subscriptionId)
    } catch {
      // Native notification teardown is best-effort during process exit.
    }
  }
  app.once('will-quit', dispose)
  return dispose
}

export const MAC_KEYBOARD_INPUT_SOURCE_CHANGED_NOTIFICATION = INPUT_SOURCE_CHANGED_NOTIFICATION
