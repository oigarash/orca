import { translate } from '@/i18n/i18n'
import type { InputMethodState } from '../../../../shared/input-method-state'

export type InputMethodStatusModel = {
  marker: 'あ' | 'A'
  statusBarLabel: 'IM: あ' | 'IM: A'
  ariaLabel: string
}

export function getInputMethodStatusModel(state: InputMethodState): InputMethodStatusModel | null {
  if (state === 'unknown') {
    return null
  }

  return state === 'active'
    ? {
        marker: 'あ',
        statusBarLabel: 'IM: あ',
        ariaLabel: translate(
          'auto.components.status.bar.InputMethodStatusSegment.active',
          'Input method: Japanese input'
        )
      }
    : {
        marker: 'A',
        statusBarLabel: 'IM: A',
        ariaLabel: translate(
          'auto.components.status.bar.InputMethodStatusSegment.inactive',
          'Input method: alphanumeric input'
        )
      }
}
