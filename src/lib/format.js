const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

const MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

export function toIsoDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function currentMonthKey(date = new Date()) {
  return toIsoDate(date).slice(0, 7)
}

export function shiftMonth(monthKey, delta) {
  const [y, m] = monthKey.split('-').map(Number)
  const date = new Date(y, m - 1 + delta, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

export function lastNMonthKeys(count, from = new Date()) {
  const end = currentMonthKey(from)
  const keys = []
  for (let i = count - 1; i >= 0; i -= 1) keys.push(shiftMonth(end, -i))
  return keys
}

export function parseIso(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return { y, m, d }
}

export function formatMonth(monthKey) {
  const [y, m] = monthKey.split('-').map(Number)
  return `${MONTHS[m - 1]} ${y}`
}

export function formatMonthShort(monthKey, withYear = false) {
  const [y, m] = monthKey.split('-').map(Number)
  const label = MONTHS_SHORT[m - 1]
  return withYear ? `${label} ${String(y).slice(2)}` : label
}

export function formatShortDate(iso) {
  const { d, m } = parseIso(iso)
  return `${d} ${MONTHS_SHORT[m - 1]}`
}

export function formatLongDate(iso) {
  const { y, m, d } = parseIso(iso)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

export function formatWeekdayDate(iso) {
  const { y, m, d } = parseIso(iso)
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()]
  return `${weekday}, ${d} ${MONTHS_SHORT[m - 1]}`
}

export function formatToday(date = new Date()) {
  return date.toLocaleDateString('en-GB', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
}

export function greeting(date = new Date()) {
  const hour = date.getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}

export function pkr(amount) {
  const n = Math.round(Number(amount) || 0)
  const sign = n < 0 ? '-' : ''
  return `${sign}Rs ${Math.abs(n).toLocaleString('en-US')}`
}

export function compactRupees(amount) {
  const n = Number(amount) || 0
  const sign = n < 0 ? '-' : ''
  const abs = Math.abs(n)
  if (abs >= 10000000) return `${sign}${(abs / 10000000).toFixed(1)}cr`
  if (abs >= 100000) return `${sign}${Math.round(abs / 1000)}k`
  if (abs >= 1000) return `${sign}${abs % 1000 === 0 ? abs / 1000 : (abs / 1000).toFixed(1)}k`
  return `${sign}${Math.round(abs)}`
}

export function percentChange(current, previous) {
  if (!previous) return current === 0 ? 0 : 100
  return ((current - previous) / Math.abs(previous)) * 100
}

export function formatChange(value) {
  if (!Number.isFinite(value)) return '0%'
  const rounded = Math.round(value * 10) / 10
  const abs = Math.abs(rounded)
  const text = Number.isInteger(abs) ? String(abs) : abs.toFixed(1)
  if (rounded > 0) return `+${text}%`
  if (rounded < 0) return `-${text}%`
  return '0%'
}

export function clamp(value, min = 0, max = 100) {
  if (!Number.isFinite(value)) return min
  return Math.max(min, Math.min(max, value))
}

export function initials(name) {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
  if (!parts.length) return 'A'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function firstName(name) {
  return String(name || '').trim().split(/\s+/)[0] || 'there'
}

export function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`
}
