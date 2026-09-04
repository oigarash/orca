import { useEffect, useState } from 'react'
import { isInputMethodState, type InputMethodState } from '../../../../shared/input-method-state'

type InputMethodAppApi = {
  getInputMethodState?: () => Promise<InputMethodState>
  onInputMethodStateChanged?: (callback: (state: InputMethodState) => void) => () => void
}

function getInputMethodAppApi(): Required<InputMethodAppApi> | null {
  const app = typeof window === 'undefined' ? undefined : (window.api?.app as InputMethodAppApi)
  return typeof app?.getInputMethodState === 'function' &&
    typeof app.onInputMethodStateChanged === 'function'
    ? (app as Required<InputMethodAppApi>)
    : null
}

function normalizeInputMethodState(state: unknown): InputMethodState {
  return isInputMethodState(state) ? state : 'unknown'
}

export function useInputMethodState(): InputMethodState {
  const [state, setState] = useState<InputMethodState>('unknown')

  useEffect(() => {
    const api = getInputMethodAppApi()
    if (!api) {
      return
    }

    let disposed = false
    let revision = 0
    const applyState = (nextState: unknown): void => {
      revision += 1
      if (!disposed) {
        setState(normalizeInputMethodState(nextState))
      }
    }
    const unsubscribe = api.onInputMethodStateChanged(applyState)
    const initialRevision = revision
    void api
      .getInputMethodState()
      .then((initialState) => {
        if (!disposed && revision === initialRevision) {
          setState(normalizeInputMethodState(initialState))
        }
      })
      .catch(() => undefined)

    return () => {
      disposed = true
      unsubscribe()
    }
  }, [])

  return state
}
