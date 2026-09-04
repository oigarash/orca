import { Button } from '@/components/ui/button'
import { translate } from '@/i18n/i18n'
import { isPairedWebClientWindow } from '@/lib/desktop-window-chrome'
import { getRendererAppPlatform } from '@/lib/renderer-app-platform'
import { useAppStore } from '@/store'
import { FLOATING_CONTROL_SURFACE_CLASS_NAME } from '../floating-control-surface'
import { useFloatingControlDragPosition } from '../use-floating-control-drag-position'
import { InputMethodFloatingIndicatorMenu } from './InputMethodFloatingIndicatorMenu'
import {
  FLOATING_INPUT_METHOD_INDICATOR_POSITION_STORAGE_KEY,
  getDefaultFloatingInputMethodIndicatorCommittedPosition
} from './floating-input-method-indicator-position'
import { getInputMethodStatusModel } from './input-method-status-model'
import { useInputMethodState } from './use-input-method-state'

function VisibleFloatingInputMethodIndicator({
  onVisibleChange
}: {
  onVisibleChange: (visible: boolean) => void
}): React.JSX.Element | null {
  const state = useInputMethodState()
  const { position, onPointerDown, onPointerMove, onPointerEnd, suppressClickAfterDrag } =
    useFloatingControlDragPosition({
      getDefaultCommittedPosition: getDefaultFloatingInputMethodIndicatorCommittedPosition,
      storageKey: FLOATING_INPUT_METHOD_INDICATOR_POSITION_STORAGE_KEY
    })
  const model = getInputMethodStatusModel(state)
  if (!model) {
    return null
  }

  const menuLabel = translate(
    'auto.components.status.bar.InputMethodStatusSegment.floatingIndicatorOptions',
    '{{status}}. Floating indicator options',
    { status: model.ariaLabel }
  )

  return (
    <span
      className="fixed z-[46]"
      style={{ left: position.left, top: position.top }}
      data-floating-input-method-indicator-position
    >
      <InputMethodFloatingIndicatorMenu
        deferOpenUntilClick
        floatingIndicatorVisible
        onFloatingIndicatorVisibleChange={onVisibleChange}
        side="left"
        tooltip={menuLabel}
        trigger={
          <Button
            type="button"
            variant="outline"
            size="icon"
            className={`cursor-grab text-sm font-semibold active:cursor-grabbing ${FLOATING_CONTROL_SURFACE_CLASS_NAME}`}
            data-floating-input-method-indicator
            aria-label={menuLabel}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onClick={suppressClickAfterDrag}
          >
            <span aria-hidden>{model.marker}</span>
          </Button>
        }
      />
    </span>
  )
}

export function FloatingInputMethodIndicator(): React.JSX.Element | null {
  const visible = useAppStore((state) => state.inputMethodFloatingIndicatorVisible)
  const setVisible = useAppStore((state) => state.setInputMethodFloatingIndicatorVisible)
  const platform = getRendererAppPlatform()
  const supported = !isPairedWebClientWindow() && (platform === 'darwin' || platform === 'win32')

  return visible && supported ? (
    <VisibleFloatingInputMethodIndicator onVisibleChange={setVisible} />
  ) : null
}
