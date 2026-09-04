import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  anchorFloatingTerminalTriggerPosition,
  clampFloatingTerminalTriggerPosition,
  persistFloatingControlPosition,
  readPersistedFloatingControlPosition,
  resolveFloatingTerminalTriggerCommittedPosition,
  shouldReconcileFloatingTerminalTriggerPosition,
  type FloatingTerminalAnchoredTriggerPosition,
  type FloatingTerminalTriggerCommittedPosition,
  type FloatingTerminalTriggerPosition,
  type FloatingTerminalTriggerPositionSource
} from './floating-terminal/floating-terminal-trigger-position'

const DRAG_THRESHOLD = 4

type FloatingControlPositionState = {
  committedPosition: FloatingTerminalTriggerCommittedPosition
  position: FloatingTerminalTriggerPosition
  source: FloatingTerminalTriggerPositionSource
}

type FloatingControlDragOptions = {
  getDefaultCommittedPosition: () => FloatingTerminalAnchoredTriggerPosition
  storageKey: string
}

type FloatingControlDragResult = {
  position: FloatingTerminalTriggerPosition
  onPointerDown: (event: React.PointerEvent<HTMLButtonElement>) => void
  onPointerMove: (event: React.PointerEvent<HTMLButtonElement>) => void
  onPointerEnd: (event: React.PointerEvent<HTMLButtonElement>) => void
  suppressClickAfterDrag: (event: React.MouseEvent<HTMLButtonElement>) => boolean
}

function resolvePosition(
  position: FloatingTerminalTriggerCommittedPosition
): FloatingTerminalTriggerPosition {
  return clampFloatingTerminalTriggerPosition(
    resolveFloatingTerminalTriggerCommittedPosition(position)
  )
}

function readInitialPosition({
  getDefaultCommittedPosition,
  storageKey
}: FloatingControlDragOptions): FloatingControlPositionState {
  const defaultCommittedPosition = getDefaultCommittedPosition()
  const defaultPosition = resolvePosition(defaultCommittedPosition)
  if (typeof window === 'undefined') {
    return {
      committedPosition: defaultCommittedPosition,
      position: defaultPosition,
      source: 'default'
    }
  }
  const persistedPosition = readPersistedFloatingControlPosition(storageKey)
  return persistedPosition
    ? {
        committedPosition: persistedPosition,
        position: shouldReconcileFloatingTerminalTriggerPosition('user')
          ? resolvePosition(persistedPosition)
          : resolveFloatingTerminalTriggerCommittedPosition(persistedPosition),
        source: 'user'
      }
    : {
        committedPosition: defaultCommittedPosition,
        position: defaultPosition,
        source: 'default'
      }
}

export function useFloatingControlDragPosition({
  getDefaultCommittedPosition,
  storageKey
}: FloatingControlDragOptions): FloatingControlDragResult {
  const initialState = useRef<FloatingControlPositionState | null>(null)
  if (initialState.current === null) {
    initialState.current = readInitialPosition({ getDefaultCommittedPosition, storageKey })
  }
  const sourceRef = useRef<FloatingTerminalTriggerPositionSource>(initialState.current.source)
  const committedPositionRef = useRef<FloatingTerminalTriggerCommittedPosition>(
    initialState.current.committedPosition
  )
  const [position, setPosition] = useState(initialState.current.position)
  const dragRef = useRef<{
    pointerId: number
    startX: number
    startY: number
    left: number
    top: number
    moved: boolean
  } | null>(null)
  const stagedPositionRef = useRef<FloatingTerminalTriggerPosition | null>(null)
  const suppressClickRef = useRef(false)

  const previewPosition = useCallback((nextPosition: FloatingTerminalTriggerPosition): void => {
    const clamped = clampFloatingTerminalTriggerPosition(nextPosition)
    stagedPositionRef.current = clamped
    setPosition(clamped)
  }, [])

  const commitPosition = useCallback(
    (nextPosition: FloatingTerminalTriggerPosition): void => {
      stagedPositionRef.current = null
      const clamped = clampFloatingTerminalTriggerPosition(nextPosition)
      setPosition(clamped)
      const anchoredPosition = anchorFloatingTerminalTriggerPosition(clamped)
      if (!anchoredPosition) {
        return
      }
      committedPositionRef.current = anchoredPosition
      sourceRef.current = 'user'
      persistFloatingControlPosition(storageKey, anchoredPosition)
    },
    [storageKey]
  )

  const reconcilePosition = useCallback((): void => {
    setPosition((current) => {
      if (!shouldReconcileFloatingTerminalTriggerPosition(sourceRef.current)) {
        // Why: don't replace an intentional saved position with a startup-size safety clamp.
        return current
      }
      return resolvePosition(
        sourceRef.current === 'default'
          ? getDefaultCommittedPosition()
          : committedPositionRef.current
      )
    })
  }, [getDefaultCommittedPosition])

  useLayoutEffect(() => {
    // Why: Electron can mount before the renderer has final viewport dimensions.
    reconcilePosition()
  }, [reconcilePosition])

  useEffect(() => {
    const handleResize = (): void => reconcilePosition()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [reconcilePosition])

  const onPointerDown = (event: React.PointerEvent<HTMLButtonElement>): void => {
    if (event.button !== 0) {
      return
    }
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      left: position.left,
      top: position.top,
      moved: false
    }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  const onPointerMove = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    const dx = event.clientX - drag.startX
    const dy = event.clientY - drag.startY
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) {
      return
    }
    drag.moved = true
    previewPosition({ left: drag.left + dx, top: drag.top + dy })
  }

  const onPointerEnd = (event: React.PointerEvent<HTMLButtonElement>): void => {
    const drag = dragRef.current
    if (!drag || drag.pointerId !== event.pointerId) {
      return
    }
    suppressClickRef.current = drag.moved
    if (drag.moved && stagedPositionRef.current) {
      commitPosition(stagedPositionRef.current)
    }
    dragRef.current = null
  }

  const suppressClickAfterDrag = (event: React.MouseEvent<HTMLButtonElement>): boolean => {
    if (!suppressClickRef.current) {
      return false
    }
    suppressClickRef.current = false
    event.preventDefault()
    event.stopPropagation()
    return true
  }

  return { position, onPointerDown, onPointerMove, onPointerEnd, suppressClickAfterDrag }
}
