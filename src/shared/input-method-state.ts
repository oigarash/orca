export type InputMethodState = 'active' | 'inactive' | 'unknown'

export const INPUT_METHOD_STATE_CHANGED_CHANNEL = 'app:inputMethodStateChanged'

export function isInputMethodState(value: unknown): value is InputMethodState {
  return value === 'active' || value === 'inactive' || value === 'unknown'
}
