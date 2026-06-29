import * as React from "react"
import { ChevronDown } from "lucide-react"

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: { value: string; label: string; disabled?: boolean }[]
  placeholder?: string
  onChange?: (value: string) => void
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, options, placeholder, onChange, value, ...props }, ref) => {
    return (
      <div className="relative">
        <select
          ref={ref}
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          className={`flex h-12 w-full appearance-none rounded-lg border border-slate-700 bg-slate-900 pr-10 pl-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            !value ? 'text-slate-500' : ''
          } ${className || ''}`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((option) => (
            <option
              key={option.value}
              value={option.value}
              disabled={option.disabled}
              className="bg-slate-900 text-white"
            >
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      </div>
    )
  }
)
Select.displayName = "Select"
