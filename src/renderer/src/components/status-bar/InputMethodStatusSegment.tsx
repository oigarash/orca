import { InputMethodFloatingIndicatorMenu } from '../input-method/InputMethodFloatingIndicatorMenu'
import { getInputMethodStatusModel } from '../input-method/input-method-status-model'
import { useInputMethodState } from '../input-method/use-input-method-state'
import { STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS } from './status-bar-context-menu-policy'

export function InputMethodStatusSegment({
  floatingIndicatorVisible,
  onFloatingIndicatorVisibleChange
}: {
  floatingIndicatorVisible: boolean
  onFloatingIndicatorVisibleChange: (visible: boolean) => void
}): React.JSX.Element | null {
  const state = useInputMethodState()
  const model = getInputMethodStatusModel(state)
  if (!model) {
    return null
  }

  return (
    <InputMethodFloatingIndicatorMenu
      floatingIndicatorVisible={floatingIndicatorVisible}
      onFloatingIndicatorVisibleChange={onFloatingIndicatorVisibleChange}
      trigger={
        <button
          type="button"
          {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
          className="inline-flex cursor-pointer items-center whitespace-nowrap rounded px-1 py-0.5 text-[11px] font-medium text-muted-foreground transition-colors hover:bg-accent/70 hover:text-foreground"
          aria-label={model.ariaLabel}
        >
          {model.statusBarLabel}
        </button>
      }
    />
  )
}
