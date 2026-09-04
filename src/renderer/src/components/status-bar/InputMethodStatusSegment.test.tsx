// @vitest-environment happy-dom

import { act } from 'react'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { InputMethodStatusSegment } from './InputMethodStatusSegment'
import type { InputMethodState } from '../../../../shared/input-method-state'

function installInputMethodApi(initialState: Promise<InputMethodState>): {
  emit: (state: InputMethodState) => void
  unsubscribe: ReturnType<typeof vi.fn>
} {
  let listener: ((state: InputMethodState) => void) | undefined
  const unsubscribe = vi.fn()
  ;(window as unknown as { api: unknown }).api = {
    app: {
      getInputMethodState: () => initialState,
      onInputMethodStateChanged: (callback: (state: InputMethodState) => void) => {
        listener = callback
        return unsubscribe
      }
    }
  }
  return {
    emit: (state) => listener?.(state),
    unsubscribe
  }
}

beforeAll(() => {
  ;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
})

afterAll(() => {
  delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
})

afterEach(() => {
  cleanup()
  delete (window as unknown as { api?: unknown }).api
})

describe('InputMethodStatusSegment', () => {
  const renderSegment = (
    floatingIndicatorVisible = false,
    onFloatingIndicatorVisibleChange = vi.fn()
  ): ReturnType<typeof render> =>
    render(
      <InputMethodStatusSegment
        floatingIndicatorVisible={floatingIndicatorVisible}
        onFloatingIndicatorVisibleChange={onFloatingIndicatorVisibleChange}
      />
    )

  it('renders the native-language marker for an active input method', async () => {
    installInputMethodApi(Promise.resolve('active'))

    renderSegment()

    expect((await screen.findByText('IM: あ')).getAttribute('aria-label')).toBe(
      'Input method: Japanese input'
    )
  })

  it('renders the alphanumeric marker for an inactive input method', async () => {
    installInputMethodApi(Promise.resolve('inactive'))

    renderSegment()

    expect((await screen.findByText('IM: A')).getAttribute('aria-label')).toBe(
      'Input method: alphanumeric input'
    )
  })

  it('stays hidden for an unknown state', async () => {
    installInputMethodApi(Promise.resolve('unknown'))

    const { container } = renderSegment()
    await act(async () => {})

    expect(container.innerHTML).toBe('')
  })

  it('follows change events and unsubscribes on unmount', async () => {
    const api = installInputMethodApi(Promise.resolve('inactive'))
    const { unmount } = renderSegment()
    await screen.findByText('IM: A')

    act(() => api.emit('active'))

    expect(screen.queryByText('IM: あ')).not.toBeNull()
    unmount()
    expect(api.unsubscribe).toHaveBeenCalledOnce()
  })

  it('does not let a stale initial read overwrite a newer change event', async () => {
    let resolveInitial!: (state: InputMethodState) => void
    const initialState = new Promise<InputMethodState>((resolve) => {
      resolveInitial = resolve
    })
    const api = installInputMethodApi(initialState)
    renderSegment()

    act(() => api.emit('active'))
    expect(screen.queryByText('IM: あ')).not.toBeNull()

    resolveInitial('inactive')
    await waitFor(() => expect(screen.queryByText('IM: A')).toBeNull())
    expect(screen.queryByText('IM: あ')).not.toBeNull()
  })

  it('opens the floating-indicator menu on click', async () => {
    const setFloatingIndicatorVisible = vi.fn()
    installInputMethodApi(Promise.resolve('inactive'))
    renderSegment(false, setFloatingIndicatorVisible)

    fireEvent.pointerDown(
      await screen.findByRole('button', { name: 'Input method: alphanumeric input' }),
      {
        button: 0,
        ctrlKey: false
      }
    )
    const item = await screen.findByRole('menuitemcheckbox', {
      name: 'Floating IM Indicator'
    })
    expect(item.getAttribute('aria-checked')).toBe('false')

    fireEvent.click(item)
    expect(setFloatingIndicatorVisible).toHaveBeenCalledWith(true)
  })
})
