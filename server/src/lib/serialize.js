function asBool(value) {
  return value === true || value === 1 || value === '1'
}

function asDate(value) {
  if (!value) return ''
  if (typeof value === 'string') return value.slice(0, 10)
  const date = new Date(value)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function plain(row) {
  return row?.get ? row.get({ plain: true }) : row
}

export function serializeTransaction(row) {
  const item = plain(row)
  return {
    id: item.id,
    type: item.type,
    title: item.title,
    category: item.category,
    amount: Number(item.amount),
    date: asDate(item.date),
    method: item.method,
    note: item.note || '',
    recurring: asBool(item.recurring),
    recurringId: item.recurringId ?? null,
    demo: asBool(item.demo),
  }
}

export function serializeRecurring(row) {
  const item = plain(row)
  const day = Number(item.dayOfMonth)
  return {
    id: item.id,
    title: item.title,
    amount: Number(item.amount),
    category: item.category,
    day,
    dayOfMonth: day,
    active: asBool(item.active),
    method: item.method || 'Bank',
    note: item.note || '',
    lastPosted: item.lastPosted || null,
  }
}

export function serializeUser(user) {
  const item = plain(user)
  return { id: item.id, name: item.name, email: item.email }
}
