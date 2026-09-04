import type { ElectronApplication } from '@stablyai/playwright-test'
import {
  INPUT_METHOD_STATE_CHANGED_CHANNEL,
  type InputMethodState
} from '../../src/shared/input-method-state'
import { FLOATING_INPUT_METHOD_INDICATOR_POSITION_STORAGE_KEY } from '../../src/renderer/src/components/input-method/floating-input-method-indicator-position'
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

test('shows the live input method state in the status bar and floating indicator', async ({
  electronApp,
  orcaPage
}) => {
  await waitForSessionReady(orcaPage)

  await sendInputMethodState(electronApp, 'inactive')
  const statusTrigger = orcaPage.getByRole('button', {
    name: 'Input method: alphanumeric input'
  })
  await expect(statusTrigger).toHaveText('IM: A')

  await statusTrigger.click()
  const floatingIndicatorItem = orcaPage
    .locator('[data-slot="dropdown-menu-content"][data-state="open"]')
    .getByRole('menuitemcheckbox', { name: 'Floating IM Indicator' })
  await expect(floatingIndicatorItem).not.toBeChecked()
  await floatingIndicatorItem.click()
  await expect
    .poll(() =>
      orcaPage.evaluate(
        () => window.__store?.getState().inputMethodFloatingIndicatorVisible ?? false
      )
    )
    .toBe(true)
  expect(await orcaPage.evaluate(() => window.api.platform.get().platform)).toBe(process.platform)
  // The synthetic IPC event is not retained by the native helper, so deliver the current state
  // once the newly enabled indicator has subscribed.
  await sendInputMethodState(electronApp, 'inactive')

  const floatingIndicator = orcaPage.locator('button[data-floating-input-method-indicator]')
  const floatingIndicatorPosition = orcaPage.locator(
    '[data-floating-input-method-indicator-position]'
  )
  await expect(floatingIndicator).toBeVisible()
  await expect(floatingIndicator).toHaveText('A')

  const floatingWorkspace = orcaPage.locator('button[data-floating-terminal-toggle]')
  await expect(floatingWorkspace).toBeVisible()
  const [indicatorBox, workspaceBox] = await Promise.all([
    floatingIndicator.boundingBox(),
    floatingWorkspace.boundingBox()
  ])
  expect(indicatorBox).not.toBeNull()
  expect(workspaceBox).not.toBeNull()
  expect(indicatorBox!.y).toBeCloseTo(workspaceBox!.y, 0)
  expect(workspaceBox!.x - indicatorBox!.x - indicatorBox!.width).toBeCloseTo(12, 0)

  await sendInputMethodState(electronApp, 'active')
  await expect(orcaPage.getByText('IM: あ', { exact: true })).toBeVisible()
  await expect(orcaPage.getByText('IM: A', { exact: true })).toHaveCount(0)
  await expect(floatingIndicator).toHaveText('あ')

  await sendInputMethodState(electronApp, 'inactive')
  await expect(orcaPage.getByText('IM: A', { exact: true })).toBeVisible()
  await expect(floatingIndicator).toHaveText('A')

  await orcaPage.mouse.move(
    indicatorBox!.x + indicatorBox!.width / 2,
    indicatorBox!.y + indicatorBox!.height / 2
  )
  const expectedMovedX = indicatorBox!.x - 96 - indicatorBox!.width / 2
  const expectedMovedY = indicatorBox!.y - 48 - indicatorBox!.height / 2
  await orcaPage.mouse.down()
  await orcaPage.mouse.move(indicatorBox!.x - 96, indicatorBox!.y - 48, { steps: 5 })
  const trackingBox = await floatingIndicatorPosition.boundingBox()
  expect(trackingBox).not.toBeNull()
  expect(trackingBox!.x).toBeCloseTo(expectedMovedX, 0)
  expect(trackingBox!.y).toBeCloseTo(expectedMovedY, 0)
  await orcaPage.mouse.up()

  await orcaPage.mouse.move(0, 0)
  await expect
    .poll(async () => (await floatingIndicatorPosition.boundingBox())?.x)
    .toBeCloseTo(expectedMovedX, 0)
  await expect
    .poll(async () => (await floatingIndicatorPosition.boundingBox())?.y)
    .toBeCloseTo(expectedMovedY, 0)

  const movedBox = await floatingIndicatorPosition.boundingBox()
  expect(movedBox).not.toBeNull()
  expect(movedBox!.x).toBeLessThan(indicatorBox!.x - 80)
  expect(movedBox!.y).toBeLessThan(indicatorBox!.y - 30)
  await expect(
    orcaPage.locator('[data-slot="dropdown-menu-content"][data-state="open"]')
  ).toHaveCount(0)
  expect(
    await orcaPage.evaluate(
      (storageKey) => window.localStorage.getItem(storageKey),
      FLOATING_INPUT_METHOD_INDICATOR_POSITION_STORAGE_KEY
    )
  ).not.toBeNull()

  await floatingIndicator.click()
  await expect(floatingIndicatorItem).toBeChecked()
  await floatingIndicatorItem.click()
  await expect(floatingIndicator).toHaveCount(0)

  await statusTrigger.click()
  await expect(floatingIndicatorItem).not.toBeChecked()
  await floatingIndicatorItem.click()
  await sendInputMethodState(electronApp, 'inactive')
  await expect(floatingIndicator).toBeVisible()
  const restoredBox = await floatingIndicatorPosition.boundingBox()
  expect(restoredBox).not.toBeNull()
  expect(restoredBox!.x).toBeCloseTo(movedBox!.x, 0)
  expect(restoredBox!.y).toBeCloseTo(movedBox!.y, 0)
})
