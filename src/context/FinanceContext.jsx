import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { api, clearToken, getToken, setToken } from '../lib/api.js'

const FinanceContext = createContext(null)

function applyTheme(theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark')
}

function readTheme() {
  try {
    const saved = localStorage.getItem('aurum-theme')
    if (saved === 'dark' || saved === 'light') return saved
  } catch {
    /* storage can be unavailable in private windows */
  }
  return 'light'
}

async function loadBundle() {
  const [dashboard, budgetRes, recurringRes] = await Promise.all([
    api('/api/dashboard/stats'),
    api('/api/budgets'),
    api('/api/recurring'),
  ])
  return {
    dashboard,
    budgets: budgetRes.budgets,
    spent: budgetRes.spent,
    recurring: recurringRes.items,
  }
}

export function FinanceProvider({ children }) {
  const [user, setUser] = useState(null)
  const [theme, setTheme] = useState(() => {
    const initial = readTheme()
    applyTheme(initial)
    return initial
  })
  const [budgets, setBudgets] = useState({})
  const [spent, setSpent] = useState({})
  const [recurring, setRecurring] = useState([])
  const [dashboard, setDashboard] = useState(null)
  const [revision, setRevision] = useState(0)
  const [booting, setBooting] = useState(true)
  const [view, setView] = useState('overview')
  const [editor, setEditor] = useState(null)
  const [toast, setToast] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)

  const notify = useCallback((message) => {
    setToast({ id: Date.now(), message })
  }, [])

  const applyBundle = useCallback((bundle) => {
    setBudgets(bundle.budgets)
    setSpent(bundle.spent)
    setRecurring(bundle.recurring)
    setDashboard(bundle.dashboard)
    setRevision((current) => current + 1)
  }, [])

  const refresh = useCallback(async () => {
    applyBundle(await loadBundle())
  }, [applyBundle])

  useEffect(() => {
    applyTheme(theme)
    try {
      localStorage.setItem('aurum-theme', theme)
    } catch {
      /* ignore */
    }
  }, [theme])

  useEffect(() => {
    if (!toast) return undefined
    const timer = window.setTimeout(() => setToast(null), 2800)
    return () => window.clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    let cancel = false
    if (!getToken()) {
      setBooting(false)
      return undefined
    }
    ;(async () => {
      try {
        const { user: nextUser } = await api('/api/auth/me')
        const bundle = await loadBundle()
        if (cancel) return
        setUser(nextUser)
        applyBundle(bundle)
      } catch {
        clearToken()
        if (!cancel) setUser(null)
      } finally {
        if (!cancel) setBooting(false)
      }
    })()
    return () => {
      cancel = true
    }
  }, [applyBundle])

  const navigate = useCallback((next) => {
    setView(next)
    setMenuOpen(false)
    setEditor(null)
  }, [])

  const openSession = useCallback(
    async (path, body, welcome) => {
      const { token, user: nextUser } = await api(path, { method: 'POST', body, auth: false })
      setToken(token)
      try {
        const bundle = await loadBundle()
        setUser(nextUser)
        applyBundle(bundle)
        setView('overview')
        setEditor(null)
        notify(welcome(nextUser))
      } catch (error) {
        clearToken()
        throw error
      }
    },
    [applyBundle, notify],
  )

  const login = useCallback(
    (body) => openSession('/api/auth/login', body, (nextUser) => `Welcome, ${nextUser.name.split(' ')[0]}`),
    [openSession],
  )

  const signup = useCallback(
    (body) => openSession('/api/auth/signup', body, (nextUser) => `Welcome, ${nextUser.name.split(' ')[0]}`),
    [openSession],
  )

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
    setBudgets({})
    setSpent({})
    setRecurring([])
    setDashboard(null)
    setView('overview')
    setEditor(null)
    setMenuOpen(false)
  }, [])

  const toggleTheme = useCallback(() => {
    setTheme((current) => (current === 'dark' ? 'light' : 'dark'))
  }, [])

  const saveTransaction = useCallback(
    async (input) => {
      try {
        if (input.id) await api(`/api/transactions/${input.id}`, { method: 'PUT', body: input })
        else await api('/api/transactions', { method: 'POST', body: input })
        await refresh()
        notify(input.id ? 'Transaction updated' : input.type === 'income' ? 'Income added' : 'Expense added')
      } catch (error) {
        notify(error.message || 'Could not save that entry')
        throw error
      }
    },
    [notify, refresh],
  )

  const removeTransaction = useCallback(
    async (id) => {
      try {
        await api(`/api/transactions/${id}`, { method: 'DELETE' })
        await refresh()
        notify('Transaction deleted')
      } catch (error) {
        notify(error.message || 'Could not delete that entry')
        throw error
      }
    },
    [notify, refresh],
  )

  const updateBudgets = useCallback(
    async (next) => {
      try {
        await api('/api/budgets', { method: 'POST', body: next })
        await refresh()
        notify('Budgets saved')
      } catch (error) {
        notify(error.message || 'Could not save budgets')
        throw error
      }
    },
    [notify, refresh],
  )

  const editRecurring = useCallback(
    async (id, patch) => {
      try {
        await api(`/api/recurring/${id}`, { method: 'PUT', body: patch })
        await refresh()
        notify('Recurring expense updated')
      } catch (error) {
        notify(error.message || 'Could not update that series')
      }
    },
    [notify, refresh],
  )

  const pauseRecurring = useCallback(
    async (id) => {
      const rule = recurring.find((item) => item.id === id)
      try {
        await api(`/api/recurring/${id}`, { method: 'PUT', body: { active: !rule?.active } })
        await refresh()
        notify(rule?.active ? 'Recurring expense paused' : 'Recurring expense resumed')
      } catch (error) {
        notify(error.message || 'Could not update that series')
      }
    },
    [notify, recurring, refresh],
  )

  const removeRecurring = useCallback(
    async (id) => {
      try {
        await api(`/api/recurring/${id}`, { method: 'DELETE' })
        await refresh()
        notify('Recurring expense removed')
      } catch (error) {
        notify(error.message || 'Could not remove that series')
      }
    },
    [notify, refresh],
  )

  const restoreDemo = useCallback(async () => {
    try {
      await api('/api/demo', { method: 'POST', body: {} })
      await refresh()
      setView('overview')
      notify('Demo data loaded')
    } catch (error) {
      notify(error.message || 'Could not load demo data')
    }
  }, [notify, refresh])

  const fetchMonthTransactions = useCallback(async (month) => {
    const data = await api(`/api/transactions?month=${encodeURIComponent(month)}&limit=1000&page=1&sort=oldest`)
    return data.items
  }, [])

  const value = useMemo(
    () => ({
      user,
      theme,
      budgets,
      spent,
      recurring,
      dashboard,
      revision,
      booting,
      view,
      editor,
      toast,
      menuOpen,
      setMenuOpen,
      notify,
      navigate,
      login,
      signup,
      logout,
      toggleTheme,
      saveTransaction,
      deleteTransaction: removeTransaction,
      saveBudgets: updateBudgets,
      updateRecurring: editRecurring,
      toggleRecurring: pauseRecurring,
      deleteRecurring: removeRecurring,
      restoreDemo,
      fetchMonthTransactions,
      openEditor: setEditor,
      closeEditor: () => setEditor(null),
    }),
    [
      user,
      theme,
      budgets,
      spent,
      recurring,
      dashboard,
      revision,
      booting,
      view,
      editor,
      toast,
      menuOpen,
      notify,
      navigate,
      login,
      signup,
      logout,
      toggleTheme,
      saveTransaction,
      removeTransaction,
      updateBudgets,
      editRecurring,
      pauseRecurring,
      removeRecurring,
      restoreDemo,
      fetchMonthTransactions,
    ],
  )

  return <FinanceContext.Provider value={value}>{children}</FinanceContext.Provider>
}

export function useFinance() {
  const context = useContext(FinanceContext)
  if (!context) throw new Error('useFinance must be used inside FinanceProvider')
  return context
}
