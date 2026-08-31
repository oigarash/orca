import { describe, expect, it } from 'vitest'
import {
  LOCAL_UPDATER_NOTIFICATION_ONLY,
  shouldAllowUpdaterInstallation
} from './local-updater-policy'

describe('local updater policy', () => {
  it('keeps the custom desktop updater notification-only', () => {
    expect(LOCAL_UPDATER_NOTIFICATION_ONLY).toBe(true)
    expect(shouldAllowUpdaterInstallation(true, 'interactive')).toBe(false)
  })

  it('does not disable supervised remote-server installs', () => {
    expect(shouldAllowUpdaterInstallation(true, 'supervised-headless-serve')).toBe(true)
  })
})
