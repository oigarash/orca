// @vitest-environment happy-dom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useAppStore } from '../store'
import { UpdateCard } from './UpdateCard'

const check = vi.fn()
const download = vi.fn()
const quitAndInstall = vi.fn()
const openUrl = vi.fn()

function setUpdateStatus(
  status:
    | { state: 'available'; version: string; changelog: null }
    | { state: 'downloaded'; version: string }
): void {
  act(() => {
    useAppStore.setState({
      updateStatus: status,
      updateChangelog: null,
      dismissedUpdateVersion: null,
      updateCardCollapsed: false,
      updateReassuranceSeen: false
    })
  })
}

beforeEach(() => {
  useAppStore.setState(useAppStore.getInitialState(), true)
  check.mockReset()
  download.mockReset()
  quitAndInstall.mockReset()
  openUrl.mockReset()
  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: vi.fn().mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn()
    })
  })
  Object.defineProperty(window, 'api', {
    configurable: true,
    value: {
      shell: { openUrl },
      ui: { set: vi.fn().mockResolvedValue(undefined) },
      updater: {
        check,
        dismissNudge: vi.fn(),
        dismissAvailableUpdate: vi.fn().mockResolvedValue(undefined),
        download,
        quitAndInstall
      }
    }
  })
})

afterEach(() => {
  cleanup()
  useAppStore.setState(useAppStore.getInitialState(), true)
})

describe('UpdateCard notification-only build', () => {
  it('announces a release without offering or starting an update', () => {
    setUpdateStatus({ state: 'available', version: '1.4.193', changelog: null })
    render(<UpdateCard />)

    expect(screen.getByText('Update Available')).toBeTruthy()
    expect(screen.getByText(/only notifies you/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Update' })).toBeNull()
    expect(download).not.toHaveBeenCalled()
    expect(quitAndInstall).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Release notes' }))
    expect(openUrl).toHaveBeenCalledWith('https://github.com/stablyai/orca/releases/tag/v1.4.193')
  })

  it('does not restart-install even if a downloaded status is received', () => {
    setUpdateStatus({ state: 'downloaded', version: '1.4.193' })
    render(<UpdateCard />)

    expect(screen.getByText(/only notifies you/)).toBeTruthy()
    expect(screen.queryByRole('button', { name: 'Restart to Update' })).toBeNull()
    expect(quitAndInstall).not.toHaveBeenCalled()
  })
})
