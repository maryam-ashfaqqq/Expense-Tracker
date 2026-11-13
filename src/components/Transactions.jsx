import { useEffect, useState } from 'react'
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES, METHODS } from '../data/categories.js'
import { useFinance } from '../context/FinanceContext.jsx'
import { api } from '../lib/api.js'
import { currentMonthKey, formatMonth, formatShortDate, pkr } from '../lib/format.js'
import { btnGhost, card, cn, field, label, moneyIn, moneyOut } from '../lib/ui.js'
import { IconSearch } from './Icons.jsx'

export function TransactionList({ items }) {
  const { recurring, openEditor, deleteTransaction } = useFinance()
  const [confirmId, setConfirmId] = useState(null)

  if (!items.length) {
    return <p className="px-5 py-10 text-center text-sm text-midnight/50 dark:text-ivory/50">No transactions match this view.</p>
  }

  return (
    <>
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-midnight/10 text-[0.68rem] uppercase tracking-[0.16em] text-midnight/45 dark:border-white/10 dark:text-ivory/45">
              <th className="px-5 py-3 font-medium">Date</th>
              <th className="px-3 py-3 font-medium">Title</th>
              <th className="px-3 py-3 font-medium">Category</th>
              <th className="px-3 py-3 font-medium">Method</th>
              <th className="px-3 py-3 text-right font-medium">Amount</th>
              <th className="px-5 py-3 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => {
              const rule = recurring.find((entry) => entry.id === item.recurringId)
              return (
                <tr key={item.id} className="border-b border-midnight/5 last:border-0 dark:border-white/5">
                  <td className="px-5 py-3 whitespace-nowrap text-midnight/70 dark:text-ivory/70">{formatShortDate(item.date)}</td>
                  <td className="px-3 py-3">
                    <p className="font-medium">{item.title}</p>
                    <p className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-midnight/50 dark:text-ivory/45">
                      {item.note || item.type}
                      {rule ? (
                        <span className="rounded-full bg-gold/15 px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.14em] text-gold-deep dark:text-gold">
                          {rule.active ? 'Monthly' : 'Paused'}
                        </span>
                      ) : null}
                    </p>
                  </td>
                  <td className="px-3 py-3">{item.category}</td>
                  <td className="px-3 py-3">{item.method}</td>
                  <td className={cn('px-3 py-3 text-right', item.type === 'income' ? moneyIn : moneyOut)}>
                    {item.type === 'income' ? '+' : '−'}
                    {pkr(item.amount)}
                  </td>
                  <td className="px-5 py-3 text-right">
                    <RowActions
                      item={item}
                      confirmId={confirmId}
                      setConfirmId={setConfirmId}
                      onEdit={() => openEditor(item)}
                      onDelete={() => {
                        deleteTransaction(item.id)
                        setConfirmId(null)
                      }}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      <ul className="space-y-3 p-4 md:hidden">
        {items.map((item) => {
          const rule = recurring.find((entry) => entry.id === item.recurringId)
          return (
            <li key={item.id} className="rounded-2xl border border-midnight/10 p-4 dark:border-white/10">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{item.title}</p>
                  <p className="mt-1 text-xs text-midnight/50 dark:text-ivory/50">
                    {formatShortDate(item.date)} · {item.category} · {item.method}
                  </p>
                </div>
                <p className={item.type === 'income' ? moneyIn : moneyOut}>
                  {item.type === 'income' ? '+' : '−'}
                  {pkr(item.amount)}
                </p>
              </div>
              {item.note ? <p className="mt-2 text-sm text-midnight/60 dark:text-ivory/60">{item.note}</p> : null}
              {rule ? (
                <p className="mt-2 text-[0.65rem] uppercase tracking-[0.14em] text-gold-deep dark:text-gold">
                  {rule.active ? 'Monthly recurring' : 'Recurring paused'}
                </p>
              ) : null}
              <div className="mt-3">
                <RowActions
                  item={item}
                  confirmId={confirmId}
                  setConfirmId={setConfirmId}
                  onEdit={() => openEditor(item)}
                  onDelete={() => {
                    deleteTransaction(item.id)
                    setConfirmId(null)
                  }}
                />
              </div>
            </li>
          )
        })}
      </ul>
    </>
  )
}

function RowActions({ item, confirmId, setConfirmId, onEdit, onDelete }) {
  if (confirmId === item.id) {
    return (
      <div className="flex justify-end gap-2">
        <button type="button" className="text-sm font-medium text-expense" onClick={onDelete}>
          Confirm
        </button>
        <button type="button" className="text-sm text-midnight/60 dark:text-ivory/60" onClick={() => setConfirmId(null)}>
          Cancel
        </button>
      </div>
    )
  }
  return (
    <div className="flex justify-end gap-3">
      <button type="button" className="text-sm font-medium text-gold-deep hover:text-gold dark:text-gold" onClick={onEdit}>
        Edit
      </button>
      <button type="button" className="text-sm text-midnight/60 hover:text-expense dark:text-ivory/60" onClick={() => setConfirmId(item.id)}>
        Delete
      </button>
    </div>
  )
}

export function TransactionsPage() {
  const { revision, notify } = useFinance()
  const [query, setQuery] = useState('')
  const [debounced, setDebounced] = useState('')
  const [category, setCategory] = useState('all')
  const [month, setMonth] = useState(currentMonthKey())
  const [method, setMethod] = useState('all')
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(1)
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)
  const [months, setMonths] = useState(() => [currentMonthKey()])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(query), 300)
    return () => window.clearTimeout(timer)
  }, [query])

  useEffect(() => {
    setPage(1)
  }, [debounced, category, month, method, sort])

  useEffect(() => {
    const controller = new AbortController()
    const params = new URLSearchParams()
    if (debounced.trim()) params.set('search', debounced.trim())
    if (category !== 'all') params.set('category', category)
    if (month !== 'all') params.set('month', month)
    if (method !== 'all') params.set('method', method)
    params.set('sort', sort)
    params.set('page', String(page))
    setLoading(true)
    api(`/api/transactions?${params}`, { signal: controller.signal })
      .then((data) => {
        setItems(data.items)
        setTotal(data.total)
        setPages(data.pages || 1)
        if (data.months?.length) setMonths(data.months)
        if (data.pages > 0 && page > data.pages) setPage(data.pages)
      })
      .catch((error) => {
        if (error?.name === 'AbortError') return
        notify(error.message || 'Could not load transactions')
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false)
      })
    return () => controller.abort()
  }, [debounced, category, month, method, sort, page, revision, notify])

  const dirty = query || category !== 'all' || month !== currentMonthKey() || method !== 'all' || sort !== 'newest'

  return (
    <div className="rise space-y-4">
      <section className={`${card} p-4 sm:p-5`}>
        <div className="grid gap-3 lg:grid-cols-12">
          <label className="relative lg:col-span-4">
            <span className="sr-only">Search by title</span>
            <IconSearch className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-midnight/40 dark:text-ivory/40" />
            <input
              className={`${field} pl-9`}
              value={query}
              placeholder="Search by title"
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <label className="lg:col-span-2">
            <span className="sr-only">Category</span>
            <select className={field} value={category} onChange={(event) => setCategory(event.target.value)}>
              <option value="all">All categories</option>
              <optgroup label="Expenses">
                {EXPENSE_CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </optgroup>
              <optgroup label="Income">
                {INCOME_CATEGORIES.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </optgroup>
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="sr-only">Month</span>
            <select className={field} value={month} onChange={(event) => setMonth(event.target.value)}>
              <option value="all">All months</option>
              {months.map((item) => (
                <option key={item} value={item}>
                  {formatMonth(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="sr-only">Payment method</span>
            <select className={field} value={method} onChange={(event) => setMethod(event.target.value)}>
              <option value="all">All methods</option>
              {METHODS.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
          <label className="lg:col-span-2">
            <span className="sr-only">Sort</span>
            <select className={field} value={sort} onChange={(event) => setSort(event.target.value)}>
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="amount-desc">Highest amount</option>
              <option value="amount-asc">Lowest amount</option>
              <option value="title">Title A–Z</option>
            </select>
          </label>
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <p className={label}>
            {loading ? 'Loading…' : `${total} transaction${total === 1 ? '' : 's'}`}
          </p>
          {dirty ? (
            <button
              type="button"
              className="text-sm font-medium text-gold-deep dark:text-gold"
              onClick={() => {
                setQuery('')
                setCategory('all')
                setMonth(currentMonthKey())
                setMethod('all')
                setSort('newest')
              }}
            >
              Clear filters
            </button>
          ) : null}
        </div>
      </section>
      <section className={card}>
        {loading && !items.length ? (
          <p className="px-5 py-10 text-center text-sm text-midnight/50 dark:text-ivory/50">Loading entries…</p>
        ) : (
          <TransactionList items={items} />
        )}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-midnight/10 px-5 py-3 dark:border-white/10">
          <p className="text-sm text-midnight/55 dark:text-ivory/55">
            Page {Math.min(page, pages)} of {pages}
          </p>
          <div className="flex gap-2">
            <button type="button" className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`} disabled={page <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </button>
            <button type="button" className={`${btnGhost} disabled:cursor-not-allowed disabled:opacity-40`} disabled={page >= pages} onClick={() => setPage((current) => current + 1)}>
              Next
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}
