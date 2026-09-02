import { describe, expect, it, vi } from 'vitest'
import { readInputMethodState } from './input-method-state'

describe('readInputMethodState', () => {
  it('reads the macOS state from the keyboard-layout snapshot', async () => {
    await expect(
      readInputMethodState(null, {
        platform: 'darwin',
        readMacSnapshot: vi.fn().mockResolvedValue({ inputMethodState: 'active' })
      })
    ).resolves.toBe('active')
  })

  it('uses the local BrowserWindow for Windows and keeps failures unknown', async () => {
    const window = { getNativeWindowHandle: vi.fn() }
    const readWindowsState = vi.fn().mockResolvedValue('inactive')
    await expect(
      readInputMethodState(window as never, { platform: 'win32', readWindowsState })
    ).resolves.toBe('inactive')
    expect(readWindowsState).toHaveBeenCalledExactlyOnceWith(window)

    await expect(
      readInputMethodState(window as never, {
        platform: 'win32',
        readWindowsState: vi.fn().mockRejectedValue(new Error('native helper unavailable'))
      })
    ).resolves.toBe('unknown')
  })

  it('returns unknown on unsupported platforms', async () => {
    await expect(readInputMethodState(null, { platform: 'linux' })).resolves.toBe('unknown')
  })
})
