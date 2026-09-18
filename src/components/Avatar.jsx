const PALETTE = [
  'bg-indigo-100 text-indigo-700',
  'bg-emerald-100 text-emerald-700',
  'bg-amber-100 text-amber-700',
  'bg-rose-100 text-rose-700',
  'bg-sky-100 text-sky-700',
  'bg-violet-100 text-violet-700',
]

function hash(str) {
  let h = 0
  for (let i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0
  return h
}

const SIZES = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm' }

export default function Avatar({ name, size = 'md' }) {
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()
  const color = PALETTE[hash(name) % PALETTE.length]
  return (
    <div className={`flex shrink-0 items-center justify-center rounded-full font-semibold ${SIZES[size]} ${color}`}>
      {initials}
    </div>
  )
}
