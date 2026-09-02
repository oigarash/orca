import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: { getAppPath: () => 'C:\\orca', isPackaged: false }
}))

import { INPUT_METHOD_STATE_CHANGED_CHANNEL } from '../../shared/input-method-state'
import {
  installWindowsInputMethodStateMonitor,
  nativeWindowHandleArgument,
  parseWindowsInputMethodState,
  readWindowsInputMethodState,
  WINDOWS_IME_NOTIFY_MESSAGE,
  WINDOWS_IME_SET_OPEN_STATUS
} from './windows-input-method-state'

describe('Windows input method state', () => {
  beforeEach(() => vi.clearAllMocks())

  it('accepts only explicit native states', () => {
    expect(parseWindowsInputMethodState('active\r\n')).toBe('active')
    expect(parseWindowsInputMethodState('inactive')).toBe('inactive')
    expect(parseWindowsInputMethodState('')).toBe('unknown')
    expect(parseWindowsInputMethodState('disabled')).toBe('unknown')
  })

  it('formats both 64-bit and 32-bit native HWND buffers', () => {
    const handle64 = Buffer.alloc(8)
    handle64.writeBigUInt64LE(0x1234n)
    const handle32 = Buffer.alloc(4)
    handle32.writeUInt32LE(0x5678)

    expect(nativeWindowHandleArgument(handle64)).toBe('0x1234')
    expect(nativeWindowHandleArgument(handle32)).toBe('0x5678')
    expect(nativeWindowHandleArgument(Buffer.alloc(2))).toBeNull()
  })

  it('runs the packaged helper through runProcess and preserves malformed output as unknown', async () => {
    const handle = Buffer.alloc(8)
    handle.writeBigUInt64LE(0x1234n)
    const run = vi.fn().mockResolvedValue({
      code: 0,
      signal: null,
      stdout: 'not-a-state',
      stderr: '',
      timedOut: false
    })

    await expect(
      readWindowsInputMethodState(
        { getNativeWindowHandle: () => handle },
        {
          platform: 'win32',
          isPackaged: true,
          resourcesPath: 'C:\\resources',
          run
        }
      )
    ).resolves.toBe('unknown')
    expect(run).toHaveBeenCalledWith({
      program: expect.stringMatching(
        /resources[\\/]input-method[\\/]orca-input-method-state\.exe$/
      ),
      args: ['0x1234'],
      timeoutMs: 750,
      maxOutputBytes: 4096
    })
  })

  it('coalesces IMN_SETOPENSTATUS and focus refreshes without publishing a stale read', async () => {
    const messages = new Map<number, (wParam: Buffer) => void>()
    const listeners = new Map<string, () => void>()
    const send = vi.fn()
    const pending: ((state: 'active' | 'inactive') => void)[] = []
    const readState = vi.fn(
      () =>
        new Promise<'active' | 'inactive'>((resolve) => {
          pending.push(resolve)
        })
    )
    const unhookWindowMessage = vi.fn()
    const window = {
      hookWindowMessage: vi.fn((message: number, callback: (wParam: Buffer) => void) => {
        messages.set(message, callback)
      }),
      unhookWindowMessage,
      on: vi.fn((event: string, listener: () => void) => listeners.set(event, listener)),
      removeListener: vi.fn((event: string) => listeners.delete(event)),
      isDestroyed: () => false,
      webContents: { isDestroyed: () => false, send }
    }

    const dispose = installWindowsInputMethodStateMonitor(window as never, {
      platform: 'win32',
      readState
    })
    const ignored = Buffer.alloc(4)
    ignored.writeUInt32LE(1)
    messages.get(WINDOWS_IME_NOTIFY_MESSAGE)?.(ignored)
    expect(readState).not.toHaveBeenCalled()

    const setOpenStatus = Buffer.alloc(4)
    setOpenStatus.writeUInt32LE(WINDOWS_IME_SET_OPEN_STATUS)
    messages.get(WINDOWS_IME_NOTIFY_MESSAGE)?.(setOpenStatus)
    listeners.get('focus')?.()
    await Promise.resolve()
    expect(readState).toHaveBeenCalledOnce()
    pending[0]('active')
    await vi.waitFor(() => expect(readState).toHaveBeenCalledTimes(2))
    expect(send).not.toHaveBeenCalled()
    pending[1]('inactive')
    await vi.waitFor(() =>
      expect(send).toHaveBeenCalledExactlyOnceWith(INPUT_METHOD_STATE_CHANGED_CHANNEL, 'inactive')
    )

    dispose()
    expect(unhookWindowMessage).toHaveBeenCalledExactlyOnceWith(WINDOWS_IME_NOTIFY_MESSAGE)
  })
})
