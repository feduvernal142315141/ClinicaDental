import * as React from 'react'

import { cn } from '@/lib/utils/utils'

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        ref={ref}
        data-slot="input"
        className={cn(
          // Shell Bento — coherente con components/ui/controls/* (Select, DateTimePicker).
          'flex w-full min-w-0 rounded-xl border border-hairline bg-elevated px-3 py-2.5 text-sm text-ink outline-none transition-colors',
          'placeholder:text-subtle',
          'focus:border-brand focus:ring-2 focus:ring-brand/30',
          'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
          'aria-invalid:border-rose-500/60',
          'file:inline-flex file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-ink',
          className,
        )}
        {...props}
      />
    )
  }
)
Input.displayName = 'Input'

export { Input }
