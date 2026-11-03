import { typingFilter, tidyName } from '../utils/personName.js'

const OLD_LABEL = 'mb-1.5 flex items-center gap-1 text-xs font-medium text-slate-500'
const OLD_INPUT =
  'w-full rounded-xl border border-slate-200 bg-slate-50/60 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline focus:outline-2 focus:outline-brand-orange/40'

// A person's name: ONE label ("POC Name") with First name and Last name as two
// inputs beneath it (the placeholders are the sub-labels). The wrapper takes the
// host grid's column span via `className`; pass the host form's own label/input
// classes so it looks native everywhere.
export default function PersonNameFields({
  label = 'Name',
  first,
  last,
  onFirst,
  onLast,
  required = true,
  lastRequired = true,
  disabled,
  className = '',
  labelClassName = OLD_LABEL,
  inputClassName = OLD_INPUT,
}) {
  const field = (value, onChange, placeholder) => (
    <input
      type="text"
      value={value}
      disabled={disabled}
      onChange={(e) => onChange(typingFilter(e.target.value))}
      onBlur={() => onChange(tidyName(value))}
      placeholder={placeholder}
      autoComplete="off"
      className={inputClassName}
    />
  )
  return (
    <div className={className}>
      <span className={labelClassName}>
        {label}
        {required && <span className="text-brand-orange-dark">*</span>}
      </span>
      <div className="grid grid-cols-2 gap-2">
        {field(first, onFirst, 'First name')}
        {field(last, onLast, lastRequired ? 'Last name' : 'Last name (optional)')}
      </div>
    </div>
  )
}
