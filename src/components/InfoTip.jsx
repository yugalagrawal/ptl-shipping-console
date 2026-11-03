import Icon from './Icon.jsx'

// Small "i" icon with a hover tooltip (native title).
export default function InfoTip({ text }) {
  return (
    <span title={text} className="cursor-help text-slate-300 hover:text-slate-500">
      <Icon name="info" className="h-3.5 w-3.5" />
    </span>
  )
}
