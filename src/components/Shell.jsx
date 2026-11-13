import { useEffect, useState } from 'react'
import { useFinance } from '../context/FinanceContext.jsx'
import { buildReport, downloadMonthlyCsv, downloadMonthlyPdf } from '../lib/export.js'
import { currentMonthKey, formatMonth, formatToday } from '../lib/format.js'
import { btnGhost, cn } from '../lib/ui.js'
import { BudgetsPage } from './Budgets.jsx'
import {
  Avatar,
  IconClose,
  IconDownload,
  IconGrid,
  IconList,
  IconLogout,
  IconMenu,
  IconMinus,
  IconMoon,
  IconPlus,
  IconRepeat,
  IconSun,
  IconTarget,
} from './Icons.jsx'
import { Overview } from './Overview.jsx'
import { RecurringPage } from './Recurring.jsx'
import { TransactionForm } from './TransactionForm.jsx'
import { TransactionsPage } from './Transactions.jsx'

const NAV = [
  { id: 'overview', label: 'Overview', icon: IconGrid },
  { id: 'transactions', label: 'Transactions', icon: IconList },
  { id: 'income', label: 'Add income', icon: IconPlus },
  { id: 'expense', label: 'Add expense', icon: IconMinus },
  { id: 'budgets', label: 'Budgets', icon: IconTarget },
  { id: 'recurring', label: 'Recurring', icon: IconRepeat },
]

const TITLES = {
  overview: 'Overview',
  transactions: 'Transactions',
  income: 'Add income',
  expense: 'Add expense',
  budgets: 'Budgets',
  recurring: 'Recurring',
}

export function Shell() {
  const {
    user,
    theme,
    view,
    editor,
    toast,
    menuOpen,
    setMenuOpen,
    navigate,
    logout,
    toggleTheme,
    closeEditor,
    budgets,
    dashboard,
    restoreDemo,
    fetchMonthTransactions,
    notify,
  } = useFinance()
  const [exporting, setExporting] = useState('')
  const [confirmRestore, setConfirmRestore] = useState(false)
  const month = currentMonthKey()
  const alerts = dashboard?.alerts || []
  const alertLevel = alerts.some((item) => item.level === 'over')
    ? 'over'
    : alerts.some((item) => item.level === 'warn')
      ? 'warn'
      : null

  useEffect(() => {
    document.title = `${TITLES[view]} · Aurum`
  }, [view])

  useEffect(() => {
    document.body.style.overflow = menuOpen || editor ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [menuOpen, editor])

  useEffect(() => {
    function onKey(event) {
      if (event.key !== 'Escape') return
      setMenuOpen(false)
      closeEditor()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeEditor, setMenuOpen])

  useEffect(() => {
    if (!confirmRestore) return undefined
    const timer = window.setTimeout(() => setConfirmRestore(false), 4000)
    return () => window.clearTimeout(timer)
  }, [confirmRestore])

  async function exportReport(kind) {
    try {
      setExporting(kind)
      const rows = await fetchMonthTransactions(month)
      const report = buildReport(rows, budgets, month, user.name)
      if (kind === 'csv') downloadMonthlyCsv(report)
      else await downloadMonthlyPdf(report)
      notify(`${formatMonth(month)} ${kind.toUpperCase()} downloaded`)
    } catch {
      notify('Could not create that report')
    } finally {
      setExporting('')
    }
  }

  return (
    <div className="min-h-screen bg-ivory text-midnight dark:bg-ink dark:text-ivory">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-3 focus:left-3 focus:z-[80] focus:rounded-lg focus:bg-gold focus:px-3 focus:py-2 focus:text-midnight"
      >
        Skip to content
      </a>
      {menuOpen ? (
        <button type="button" className="fixed inset-0 z-40 bg-sidebar/70 lg:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      ) : null}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex w-68 flex-col border-r border-gold/25 bg-sidebar text-ivory transition-transform duration-300 lg:translate-x-0',
          menuOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex items-start justify-between px-5 pt-6">
          <button type="button" onClick={() => navigate('overview')} className="text-left">
            <p className="font-serif text-4xl leading-none">
              Aurum<span className="text-gold">.</span>
            </p>
            <p className="mt-2 text-[0.62rem] uppercase tracking-[0.28em] text-gold">Ledger</p>
          </button>
          <button type="button" className="rounded-lg p-2 text-ivory/70 lg:hidden" aria-label="Close menu" onClick={() => setMenuOpen(false)}>
            <IconClose />
          </button>
        </div>
        <nav className="mt-8 flex-1 space-y-1 px-3" aria-label="Primary">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = view === item.id
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate(item.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition',
                  active ? 'bg-gold/15 text-gold' : 'text-ivory/70 hover:bg-white/5 hover:text-ivory',
                )}
                aria-current={active ? 'page' : undefined}
              >
                <Icon />
                <span>{item.label}</span>
                {item.id === 'budgets' && alertLevel ? (
                  <span className={cn('ml-auto h-2 w-2 rounded-full', alertLevel === 'over' ? 'bg-expense' : 'bg-warn')} />
                ) : null}
              </button>
            )
          })}
        </nav>
        <div className="space-y-3 px-4 pb-5">
          <button
            type="button"
            className="w-full text-left text-[0.68rem] uppercase tracking-[0.16em] text-ivory/40 hover:text-gold"
            onClick={() => {
              if (!confirmRestore) {
                setConfirmRestore(true)
                return
              }
              setConfirmRestore(false)
              restoreDemo()
            }}
          >
            {confirmRestore ? 'Confirm load demo' : 'Load Demo Data'}
          </button>
          <div className="flex items-center gap-3 rounded-2xl border border-white/10 p-3">
            <Avatar name={user.name} />
            <div className="min-w-0">
              <p className="truncate text-sm">{user.name}</p>
              <p className="text-[0.62rem] uppercase tracking-[0.18em] text-gold">Personal</p>
            </div>
          </div>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-white/10 px-3 py-2.5 text-sm text-ivory/80 transition hover:border-gold hover:text-gold"
          >
            <IconLogout className="h-4 w-4" />
            Log out
          </button>
        </div>
      </aside>

      <div className="lg:pl-[272px]">
        <header className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-midnight/10 bg-ivory/90 px-4 py-3 backdrop-blur-md dark:border-white/10 dark:bg-ink/90 sm:px-6">
          <button type="button" className="rounded-lg p-2 lg:hidden" aria-label="Open menu" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}>
            <IconMenu />
          </button>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold tracking-tight">{TITLES[view]}</h1>
            <p className="hidden text-xs text-midnight/50 sm:block dark:text-ivory/50">{formatToday()}</p>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button type="button" className={btnGhost} disabled={Boolean(exporting)} onClick={() => exportReport('csv')} aria-label={`Download ${formatMonth(month)} CSV report`}>
              <IconDownload />
              {exporting === 'csv' ? 'Saving' : 'CSV'}
            </button>
            <button type="button" className={btnGhost} disabled={Boolean(exporting)} onClick={() => exportReport('pdf')} aria-label={`Download ${formatMonth(month)} PDF report`}>
              <IconDownload />
              {exporting === 'pdf' ? 'Saving' : 'PDF'}
            </button>
            <button
              type="button"
              className={btnGhost}
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {theme === 'dark' ? <IconSun /> : <IconMoon />}
              <span className="hidden sm:inline">{theme === 'dark' ? 'Light' : 'Dark'}</span>
            </button>
            <span className="hidden items-center gap-2 pl-1 md:flex">
              <Avatar name={user.name} size={34} />
              <span className="max-w-32 truncate text-sm font-medium">{user.name}</span>
            </span>
          </div>
        </header>
        <main id="main" className="mx-auto w-full max-w-[1180px] px-4 py-6 sm:px-6 lg:px-8">
          {view === 'overview' ? <Overview /> : null}
          {view === 'transactions' ? <TransactionsPage /> : null}
          {view === 'income' ? <TransactionForm mode="income" /> : null}
          {view === 'expense' ? <TransactionForm mode="expense" /> : null}
          {view === 'budgets' ? <BudgetsPage /> : null}
          {view === 'recurring' ? <RecurringPage /> : null}
        </main>
      </div>

      {editor ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-sidebar/70 sm:items-center sm:p-4" onClick={closeEditor}>
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-title"
            className="max-h-[92vh] w-full overflow-auto rounded-t-3xl bg-white p-5 sm:max-w-lg sm:rounded-3xl sm:p-6 dark:bg-charcoal"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mb-4 flex items-start justify-between gap-3">
              <h2 id="edit-title" className="text-lg font-semibold">
                Edit {editor.type}
              </h2>
              <button type="button" className="rounded-lg p-2" aria-label="Close editor" onClick={closeEditor}>
                <IconClose />
              </button>
            </div>
            <TransactionForm mode={editor.type} initial={editor} onDone={closeEditor} />
          </div>
        </div>
      ) : null}

      {toast ? (
        <div
          role="status"
          className="fixed right-4 bottom-4 z-[70] rounded-full bg-sidebar px-4 py-2.5 text-sm text-ivory shadow-lg dark:bg-gold dark:text-midnight"
        >
          {toast.message}
        </div>
      ) : null}
    </div>
  )
}
