import { useEffect, useState } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, METHODS } from '../data/categories.js'
import { useFinance } from '../context/FinanceContext.jsx'
import { toIsoDate } from '../lib/format.js'
import { btnGold, btnGhost, card, cn, field, label } from '../lib/ui.js'

function emptyValues(mode) {
  return {
    title: '',
    category: mode === 'income' ? 'Salary' : 'Food',
    amount: '',
    date: toIsoDate(),
    method: mode === 'income' ? 'Bank' : 'JazzCash',
    note: '',
    makeRecurring: false,
  }
}

function fromRecord(mode, initial, recurring) {
  if (!initial) return emptyValues(mode)
  const rule = recurring.find((item) => item.id === initial.recurringId)
  return {
    title: initial.title || '',
    category: initial.category,
    amount: String(initial.amount ?? ''),
    date: initial.date,
    method: initial.method,
    note: initial.note || '',
    makeRecurring: Boolean(rule?.active),
  }
}

export function TransactionForm({ mode, initial = null, onDone }) {
  const { saveTransaction, navigate, recurring } = useFinance()
  const [values, setValues] = useState(() => fromRecord(mode, initial, recurring))
  const [errors, setErrors] = useState({})
  const [saving, setSaving] = useState(false)
  const categories = mode === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const prefix = initial?.id ? `edit-${initial.id}` : mode

  useEffect(() => {
    setValues(fromRecord(mode, initial, recurring))
    setErrors({})
    // Recurring is read once per record so typing is not reset.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, initial])

  function update(key, value) {
    setValues((prev) => ({ ...prev, [key]: value }))
    setErrors((prev) => ({ ...prev, [key]: '' }))
  }

  async function submit(event) {
    event.preventDefault()
    const nextErrors = {}
    const title = values.title.trim()
    const amount = Number(values.amount)
    if (title.length < 2) nextErrors.title = 'Add a short title.'
    else if (title.length > 80) nextErrors.title = 'Keep the title under 80 characters.'
    if (!Number.isFinite(amount) || amount <= 0) nextErrors.amount = 'Enter an amount greater than zero.'
    else if (amount > 100000000) nextErrors.amount = 'Enter an amount under Rs 100,000,000.'
    if (!/^\d{4}-\d{2}-\d{2}$/.test(values.date)) nextErrors.date = 'Choose a date.'
    if (!categories.includes(values.category)) nextErrors.category = 'Choose a category.'
    if (!METHODS.includes(values.method)) nextErrors.method = 'Choose a payment method.'
    if (values.note.length > 180) nextErrors.note = 'Keep the note under 180 characters.'
    setErrors(nextErrors)
    const first = Object.keys(nextErrors)[0]
    if (first) {
      document.getElementById(`${prefix}-${first}`)?.focus()
      return
    }
    setSaving(true)
    try {
      await saveTransaction({
        id: initial?.id,
        type: mode,
        title,
        category: values.category,
        amount,
        date: values.date,
        method: values.method,
        note: values.note,
        recurringId: initial?.recurringId || null,
        makeRecurring: mode === 'expense' && values.makeRecurring,
      })
      if (initial?.id) onDone?.()
      else setValues(emptyValues(mode))
    } catch {
      /* the ledger toast already explains the failure */
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={submit} className={`${card} rise mx-auto max-w-2xl p-5 sm:p-7`} noValidate>
      <p className={label}>{mode === 'income' ? 'Money in' : 'Money out'}</p>
      <h2 className="mt-2 text-2xl font-semibold">{initial ? 'Update this entry' : mode === 'income' ? 'Record income' : 'Record an expense'}</h2>
      <p className="mt-2 text-sm text-midnight/60 dark:text-ivory/60">
        {mode === 'income'
          ? 'Salary, freelance, and anything else that landed in your accounts.'
          : 'Category, method, and an optional monthly repeat for rent, internet, and similar bills.'}
      </p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2" htmlFor={`${prefix}-title`}>
          <span className="mb-1.5 block text-sm font-medium">Title</span>
          <input
            id={`${prefix}-title`}
            className={field}
            value={values.title}
            placeholder={mode === 'income' ? 'November salary' : 'Weekly groceries'}
            onChange={(event) => update('title', event.target.value)}
          />
          {errors.title ? <span className="mt-1 block text-sm text-expense">{errors.title}</span> : null}
        </label>

        <label htmlFor={`${prefix}-category`}>
          <span className="mb-1.5 block text-sm font-medium">Category</span>
          <select id={`${prefix}-category`} className={field} value={values.category} onChange={(event) => update('category', event.target.value)}>
            {categories.map((item) => (
              <option key={item}>{item}</option>
            ))}
          </select>
          {errors.category ? <span className="mt-1 block text-sm text-expense">{errors.category}</span> : null}
        </label>

        <label htmlFor={`${prefix}-amount`}>
          <span className="mb-1.5 block text-sm font-medium">Amount</span>
          <span className="relative block">
            <span className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-sm text-midnight/45 dark:text-ivory/45">Rs</span>
            <input
              id={`${prefix}-amount`}
              className={`${field} pl-10`}
              inputMode="decimal"
              type="number"
              min="1"
              step="1"
              value={values.amount}
              placeholder="0"
              onChange={(event) => update('amount', event.target.value)}
            />
          </span>
          {errors.amount ? <span className="mt-1 block text-sm text-expense">{errors.amount}</span> : null}
        </label>

        <label htmlFor={`${prefix}-date`}>
          <span className="mb-1.5 block text-sm font-medium">Date</span>
          <input id={`${prefix}-date`} className={field} type="date" value={values.date} onChange={(event) => update('date', event.target.value)} />
          {errors.date ? <span className="mt-1 block text-sm text-expense">{errors.date}</span> : null}
        </label>

        <fieldset>
          <legend className="mb-1.5 text-sm font-medium">Payment method</legend>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((item) => (
              <button
                key={item}
                type="button"
                className={cn(
                  'rounded-xl border px-2 py-2.5 text-sm font-medium transition',
                  values.method === item
                    ? 'border-primary bg-primary text-ivory dark:border-secondary dark:bg-secondary dark:text-ivory'
                    : 'border-midnight/10 hover:border-gold dark:border-white/10',
                )}
                onClick={() => update('method', item)}
                aria-pressed={values.method === item}
              >
                {item}
              </button>
            ))}
          </div>
          {errors.method ? <span className="mt-1 block text-sm text-expense">{errors.method}</span> : null}
        </fieldset>

        <label className="sm:col-span-2" htmlFor={`${prefix}-note`}>
          <span className="mb-1.5 block text-sm font-medium">Note</span>
          <textarea
            id={`${prefix}-note`}
            className={`${field} min-h-24 resize-y`}
            value={values.note}
            placeholder="Optional detail"
            onChange={(event) => update('note', event.target.value)}
          />
          {errors.note ? <span className="mt-1 block text-sm text-expense">{errors.note}</span> : null}
        </label>
      </div>

      {mode === 'expense' ? (
        <label className="mt-5 flex items-start gap-3 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3">
          <input
            type="checkbox"
            className="mt-1 accent-[#C6A15B]"
            checked={values.makeRecurring}
            onChange={(event) => update('makeRecurring', event.target.checked)}
          />
          <span>
            <span className="block text-sm font-medium">Monthly recurring</span>
            <span className="mt-1 block text-sm text-midnight/60 dark:text-ivory/65">
              Repeats on this day each month, the way rent does. Turning it off pauses the series. Past entries stay as they were.
            </span>
          </span>
        </label>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        <button className={btnGold} type="submit" disabled={saving}>
          {initial ? 'Save changes' : mode === 'income' ? 'Add income' : 'Add expense'}
        </button>
        {initial ? (
          <button className={btnGhost} type="button" onClick={onDone}>
            Cancel
          </button>
        ) : (
          <button className={btnGhost} type="button" onClick={() => navigate('overview')}>
            Back to overview
          </button>
        )}
      </div>
    </form>
  )
}
