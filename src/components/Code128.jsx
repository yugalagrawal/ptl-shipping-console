// Code 128 (subset C) barcode as inline SVG — digits only, two per symbol, which
// suits the 12-digit package numbers (6 symbols). Encoding follows the standard
// symbol table: start C, data pairs, weighted mod-103 check symbol, stop.
const PATTERNS = '212222 222122 222221 121223 121322 131222 122213 122312 132212 221213 221312 231212 112232 122132 122231 113222 123122 123221 223211 221132 221231 213212 223112 312131 311222 321122 321221 312212 322112 322211 212123 212321 232121 111323 131123 131321 112313 132113 132311 211313 231113 231311 112133 112331 132131 113123 113321 133121 313121 211331 231131 213113 213311 213131 311123 311321 331121 312113 312311 332111 314111 221411 431111 111224 111422 121124 121421 141122 141221 112214 112412 122114 122411 142112 142211 241211 221114 413111 241112 134111 111242 121142 121241 114212 124112 124211 411212 421112 421211 212141 214121 412121 111143 111341 131141 114113 114311 411113 411311 113141 114131 311141 411131 211412 211214 211232 2331112'.split(' ')
const START_C = 105
const STOP = 106

export function code128C(digits) {
  if (!/^\d+$/.test(digits) || digits.length % 2) throw new Error('Code 128-C needs an even number of digits')
  const values = [START_C]
  for (let i = 0; i < digits.length; i += 2) values.push(Number(digits.slice(i, i + 2)))
  const check = values.reduce((sum, v, i) => sum + (i === 0 ? v : v * i), 0) % 103
  values.push(check, STOP)
  return values.map((v) => PATTERNS[v]).join('')
}

export default function Code128({ value, height = 64, className = '' }) {
  const widths = code128C(value)
  const quiet = 10
  const total = [...widths].reduce((s, w) => s + Number(w), 0)
  let x = quiet
  const bars = []
  ;[...widths].forEach((w, i) => {
    const n = Number(w)
    if (i % 2 === 0) bars.push(<rect key={i} x={x} y={0} width={n} height={height} />)
    x += n
  })
  return (
    <svg viewBox={`0 0 ${total + quiet * 2} ${height}`} preserveAspectRatio="none" role="img" aria-label={`Barcode ${value}`} className={className} fill="currentColor">
      {bars}
    </svg>
  )
}
