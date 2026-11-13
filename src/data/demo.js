import { DEFAULT_BUDGETS } from './categories.js'

const RENT = 'rec-rent'
const NET = 'rec-net'
const STREAM = 'rec-stream'

function slug(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function row(date, type, category, title, amount, method, note = '', recurringId = '') {
  return {
    id: slug(`${date}-${title}`),
    type,
    category,
    title,
    amount,
    date,
    method,
    note,
    recurringId: recurringId || null,
    demo: true,
  }
}

const TRANSACTIONS = [
  row('2026-11-08', 'expense', 'Health', 'Pharmacy run', 2600, 'Cash', 'Cold medicine and vitamins'),
  row('2026-11-09', 'expense', 'Food', 'Metro groceries', 3900, 'Cash', 'Metro Cash and Carry'),
  row('2026-11-09', 'expense', 'Transport', 'Shell fuel', 2400, 'Cash', 'City driving'),
  
]

export const DEMO_RECURRING = [
  {
    id: RENT,
    title: 'Apartment rent',
    category: 'Rent',
    amount: 45000,
    method: 'Bank',
    note: 'DHA Phase 5 apartment',
    day: 1,
    active: true,
    lastPosted: null,
  },
  {
    id: STREAM,
    title: 'Streaming plans',
    category: 'Entertainment',
    amount: 1500,
    method: 'JazzCash',
    note: 'Monthly streaming bundle',
    day: 3,
    active: true,
    lastPosted: null,
  },
  {
    id: NET,
    title: 'Home internet',
    category: 'Bills',
    amount: 3500,
    method: 'JazzCash',

    day: 5,
    active: true,
    lastPosted: null,
  },
]

export function createDemoState() {
  return {
    user: null,
    theme: 'light',
    transactions: TRANSACTIONS.map((item) => ({ ...item })),
    budgets: { ...DEFAULT_BUDGETS },
    recurring: DEMO_RECURRING.map((item) => ({ ...item })),
  }
}
