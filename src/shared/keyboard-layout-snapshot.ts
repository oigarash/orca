import type { InputMethodState } from './input-method-state'

export type KeyboardLayoutKeyCharacters = {
  unmodified: string | null
  shifted: string | null
}

export type KeyboardLayoutSnapshot = {
  inputSourceId: string | null
  layoutSourceId?: string | null
  inputMethodState?: InputMethodState
  keyCharacters: Record<string, KeyboardLayoutKeyCharacters>
}
