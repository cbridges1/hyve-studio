import { input, label as labelClass, textarea } from './theme'

type TextFieldProps = {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  type?: string
}

export function TextField({ label, value, onChange, placeholder, required, type = 'text' }: TextFieldProps) {
  return (
    <label className="block">
      <span className={labelClass}>
        {label}
        {required && <span className="text-accent"> *</span>}
      </span>
      <input
        type={type}
        className={input}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

type TextAreaFieldProps = {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  rows?: number
}

export function TextAreaField({ label, value, onChange, placeholder, rows = 4 }: TextAreaFieldProps) {
  return (
    <label className="block">
      <span className={labelClass}>{label}</span>
      <textarea
        className={textarea}
        rows={rows}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
      />
    </label>
  )
}

export function CheckboxField({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-ink-dim cursor-pointer select-none">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 accent-accent"
      />
      {label}
    </label>
  )
}
