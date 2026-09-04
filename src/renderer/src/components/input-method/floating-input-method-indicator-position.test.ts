import { describe, expect, it } from 'vitest'
import {
  FLOATING_TERMINAL_TRIGGER_DEFAULT_BOTTOM_GAP,
  FLOATING_TERMINAL_TRIGGER_DEFAULT_RIGHT_GAP
} from '../floating-terminal/floating-terminal-trigger-position'
import {
  FLOATING_INPUT_METHOD_INDICATOR_BOTTOM_GAP,
  FLOATING_INPUT_METHOD_INDICATOR_RIGHT_GAP,
  FLOATING_INPUT_METHOD_INDICATOR_SIBLING_GAP,
  FLOATING_INPUT_METHOD_INDICATOR_SIZE,
  getDefaultFloatingInputMethodIndicatorCommittedPosition
} from './floating-input-method-indicator-position'

describe('floating input method indicator position', () => {
  it('parks to the left of the default floating workspace trigger', () => {
    expect(FLOATING_INPUT_METHOD_INDICATOR_RIGHT_GAP).toBe(
      FLOATING_TERMINAL_TRIGGER_DEFAULT_RIGHT_GAP +
        FLOATING_INPUT_METHOD_INDICATOR_SIZE +
        FLOATING_INPUT_METHOD_INDICATOR_SIBLING_GAP
    )
    expect(FLOATING_INPUT_METHOD_INDICATOR_BOTTOM_GAP).toBe(
      FLOATING_TERMINAL_TRIGGER_DEFAULT_BOTTOM_GAP
    )
    expect(getDefaultFloatingInputMethodIndicatorCommittedPosition()).toEqual({
      anchorX: 'right',
      anchorY: 'bottom',
      offsetX: 72,
      offsetY: 72
    })
  })
})
