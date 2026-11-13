import { useState } from 'react'
import { EXPENSE_CATEGORIES, METHODS } from '../data/categories.js'
import { useFinance } from '../context/FinanceContext.jsx'
import { formatLongDate } from '../lib/format.js'
import { nextRecurringDate } from '../lib/ledger.js'
import { btnGhost, btnGold, card, cn, field, label, moneyOut } from '../lib/ui.js'
import { pkr } from '../lib/format.js'

export function RecurringPage() {
  const { recurring, updateRecurring, toggleRecurring, deleteRecurring, navigate } = useFinance()
  const [editing, setEditing] = useState(null)
  const [confirmId, setConfirmId] = useState(null)
  const ordered = [...recurring].sort((a, b) => Number(a.day) - Number(b.day) || a.title.localeCompare(b.title))

  return (
    <div className="rise space-y-4">
      <section className={`${card} p-5 sm:p-6`}>
        <p className={label}>Standing charges</p>
        <h2 className="mt-2 text-2xl font-semibold">Monthly recurring</h2>
        <p className="mt-2 max-w-2xl text-sm text-midnight/60 dark:text-ivory/60">
          Mark an expense as monthly and Aurum posts it on that day each month. Rent, internet, and subscriptions belong here. Pausing stops future posts and leaves history intact.
        </p>
        <button type="button" className={`${btnGold} mt-5`} onClick={() => navigate('expense')}>
          Add recurring expense
        </button>
      </section>

      {ordered.length ? (
        <div className="grid gap-4">
          {ordered.map((rule) => (
            <article key={rule.id} className={`${card} p-5`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold">{rule.title}</h3>
                    <span
                      className={cn(
                        'rounded-full px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em]',
                        rule.active ? 'bg-gold/15 text-gold-deep dark:text-gold' : 'bg-midnight/5 text-midnight/50 dark:bg-white/10 dark:text-ivory/50',
                      )}
                    >
                      {rule.active ? 'Active' : 'Paused'}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-midnight/55 dark:text-ivory/55">
                    {rule.category} · {rule.method} · Day {rule.day}
                  </p>
                  {rule.note ? <p className="mt-2 text-sm">{rule.note}</p> : null}
                  <p className="mt-2 text-sm text-midnight/55 dark:text-ivory/55">
                    {rule.active ? `Next charge ${formatLongDate(nextRecurringDate(rule))}` : 'No future charge while paused'}
                  </p>
                </div>
                <p className={`text-2xl ${moneyOut}`}>{pkr(rule.amount)}</p>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <button type="button" className={btnGhost} onClick={() => setEditing(editing === rule.id ? null : rule.id)}>
                  {editing === rule.id ? 'Close' : 'Edit'}
                </button>
                <button type="button" className={btnGhost} onClick={() => toggleRecurring(rule.id)}>
                  {rule.active ? 'Pause' : 'Resume'}
                </button>
                {confirmId === rule.id ? (
                  <>
                    <button type="button" className={btnGhost} onClick={() => setConfirmId(null)}>
                      Cancel
                    </button>
                    <button
                      type="button"
                      className="rounded-xl bg-expense px-4 py-2.5 text-sm font-semibold text-white"
                      onClick={() => {
                        deleteRecurring(rule.id)
                        setConfirmId(null)
                        setEditing(null)
                      }}
                    >
                      Remove series
                    </button>
                  </>
                ) : (
                  <button type="button" className={btnGhost} onClick={() => setConfirmId(rule.id)}>
                    Remove
                  </button>
                )}
              </div>
              {editing === rule.id ? <RuleForm rule={rule} onSave={(patch) => updateRecurring(rule.id, patch)} /> : null}
            </article>
          ))}
        </div>
      ) : (
        <section className={`${card} p-8 text-center`}>
          <p className="text-sm text-midnight/60 dark:text-ivory/60">No monthly series yet. Add an expense and tick Monthly recurring.</p>
        </section>
      )}
    </div>
  )
}

function RuleForm({ rule, onSave }) {
  const [values, setValues] = useState({
    title: rule.title,
    category: rule.category,
    amount: String(rule.amount),
    day: String(rule.day),
    method: rule.method,
    note: rule.note || '',
  })
  const [error, setError] = useState('')

  function submit(event) {
    event.preventDefault()
    const amount = Number(values.amount)
    const day = Number(values.day)
    if (values.title.trim().length < 2) {
      setError('Add a title.')
      return
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter an amount greater than zero.')
      return
    }
    if (!Number.isInteger(day) || day < 1 || day > 31) {
      setError('Use a day between 1 and 31.')
      return
    }
    onSave({
      title: values.title.trim(),
      category: values.category,
      amount: Math.round(amount),
      day,
      method: values.method,
      note: values.note.trim(),
    })
    setError('')
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-3 border-t border-midnight/10 pt-4 sm:grid-cols-2 dark:border-white/10">
      <p className="sm:col-span-2 text-sm text-midnight/55 dark:text-ivory/55">Future months use this amount. Past entries stay as they were.</p>
      <label>
        <span className="mb-1 block text-sm">Title</span>
        <input className={field} value={values.title} onChange={(event) => setValues((prev) => ({ ...prev, title: event.target.value }))} />
      </label>
      <label>
        <span className="mb-1 block text-sm">Category</span>
        <select className={field} value={values.category} onChange={(event) => setValues((prev) => ({ ...prev, category: event.target.value }))}>
          {EXPENSE_CATEGORIES.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-sm">Amount</span>
        <input className={field} type="number" min="1" value={values.amount} onChange={(event) => setValues((prev) => ({ ...prev, amount: event.target.value }))} />
      </label>
      <label>
        <span className="mb-1 block text-sm">Day of month</span>
        <input className={field} type="number" min="1" max="31" value={values.day} onChange={(event) => setValues((prev) => ({ ...prev, day: event.target.value }))} />
      </label>
      <label>
        <span className="mb-1 block text-sm">Payment method</span>
        <select className={field} value={values.method} onChange={(event) => setValues((prev) => ({ ...prev, method: event.target.value }))}>
          {METHODS.map((item) => (
            <option key={item}>{item}</option>
          ))}
        </select>
      </label>
      <label>
        <span className="mb-1 block text-sm">Note</span>
        <input className={field} value={values.note} onChange={(event) => setValues((prev) => ({ ...prev, note: event.target.value }))} />
      </label>
      {error ? <p className="text-sm text-expense sm:col-span-2">{error}</p> : null}
      <div>
        <button className={btnGold} type="submit">
          Save series
        </button>
      </div>
    </form>
  )
}
