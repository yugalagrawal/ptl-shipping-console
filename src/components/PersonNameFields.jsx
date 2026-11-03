import { typingFilter, tidyName } from '../utils/personName.js'

// The two name inputs for a person — rendered with whichever `Field` component
// the host form already uses, so they look native everywhere. Returns a
// fragment: drop it straight into the form's grid.
export default function PersonNameFields({
  Field,
  first,
  last,
  onFirst,
  onLast,
  firstLabel = 'First name',
  lastLabel = 'Last name',
  required = true,
  lastRequired = true,
  disabled,
}) {
  return (
    <>
      <Field
        label={firstLabel}
        required={required}
        disabled={disabled}
        value={first}
        onChange={(e) => onFirst(typingFilter(e.target.value))}
        onBlur={() => onFirst(tidyName(first))}
        placeholder="First name"
        autoComplete="off"
      />
      <Field
        label={lastLabel}
        required={required && lastRequired}
        disabled={disabled}
        value={last}
        onChange={(e) => onLast(typingFilter(e.target.value))}
        onBlur={() => onLast(tidyName(last))}
        placeholder="Last name"
        autoComplete="off"
      />
    </>
  )
}
