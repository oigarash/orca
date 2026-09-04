import { useState, type ReactElement } from 'react'
import { PictureInPicture2 } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { translate } from '@/i18n/i18n'
import { STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS } from '../status-bar/status-bar-context-menu-policy'

type InputMethodFloatingIndicatorMenuProps = {
  align?: 'start' | 'center' | 'end'
  deferOpenUntilClick?: boolean
  floatingIndicatorVisible: boolean
  onFloatingIndicatorVisibleChange: (visible: boolean) => void
  side?: 'top' | 'right' | 'bottom' | 'left'
  tooltip?: string
  trigger: ReactElement
}

export function InputMethodFloatingIndicatorMenu({
  align = 'end',
  deferOpenUntilClick = false,
  floatingIndicatorVisible,
  onFloatingIndicatorVisibleChange,
  side = 'top',
  tooltip,
  trigger
}: InputMethodFloatingIndicatorMenuProps): React.JSX.Element {
  const [open, setOpen] = useState(false)
  const menuTrigger = (
    <DropdownMenuTrigger
      asChild
      onPointerDown={deferOpenUntilClick ? (event) => event.preventDefault() : undefined}
      onClick={
        deferOpenUntilClick
          ? (event) => {
              if (!event.defaultPrevented && event.detail > 0) {
                setOpen((current) => !current)
              }
            }
          : undefined
      }
    >
      {trigger}
    </DropdownMenuTrigger>
  )

  return (
    <DropdownMenu modal={false} open={open} onOpenChange={setOpen}>
      {tooltip ? (
        <Tooltip>
          <TooltipTrigger asChild>{menuTrigger}</TooltipTrigger>
          <TooltipContent side={side} sideOffset={6}>
            {tooltip}
          </TooltipContent>
        </Tooltip>
      ) : (
        menuTrigger
      )}
      <DropdownMenuContent
        {...STATUS_BAR_CONTEXT_MENU_EXEMPT_PROPS}
        side={side}
        align={align}
        sideOffset={8}
      >
        <DropdownMenuCheckboxItem
          checked={floatingIndicatorVisible}
          onCheckedChange={(checked) => {
            onFloatingIndicatorVisibleChange(checked === true)
            setOpen(false)
          }}
        >
          <PictureInPicture2 className="size-3.5" />
          {translate(
            'auto.components.status.bar.InputMethodStatusSegment.floatingIndicator',
            'Floating IM Indicator'
          )}
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
