import type { ElectronApplication } from '@stablyai/playwright-test'
import {
  INPUT_METHOD_STATE_CHANGED_CHANNEL,
  type InputMethodState
} from '../../src/shared/input-method-state'
import { test, expect } from './helpers/orca-app'
import { waitForSessionReady } from './helpers/store'

test.skip(
  process.platform !== 'darwin' && process.platform !== 'win32',
  'Input method status is available only on macOS and Windows'
)

async function sendInputMethodState(
  electronApp: ElectronApplication,
  state: InputMethodState
): Promise<void> {
  await electronApp.evaluate(
    ({ BrowserWindow }, payload) => {
      BrowserWindow.getAllWindows()[0]?.webContents.send(payload.channel, payload.state)
    },
    { channel: INPUT_METHOD_STATE_CHANGED_CHANNEL, state }
  )
}

test('updates the input method status without reloading', async ({ electronApp, orcaPage }) => {
  await waitForSessionReady(orcaPage)

  await sendInputMethodState(electronApp, 'inactive')
  await expect(orcaPage.getByText('IM: A', { exact: true })).toBeVisible()

  await sendInputMethodState(electronApp, 'active')
  await expect(orcaPage.getByText('IM: あ', { exact: true })).toBeVisible()
  await expect(orcaPage.getByText('IM: A', { exact: true })).toHaveCount(0)

  await sendInputMethodState(electronApp, 'inactive')
  await expect(orcaPage.getByText('IM: A', { exact: true })).toBeVisible()
})
