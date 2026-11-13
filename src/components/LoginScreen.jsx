import { useEffect, useState } from 'react'
import { useFinance } from '../context/FinanceContext.jsx'
import { btnGold, field, label } from '../lib/ui.js'

export function LoginScreen() {
  const { login, signup } = useFinance()
  const [mode, setMode] = useState('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    document.title = mode === 'login' ? 'Sign in · Aurum' : 'Create account · Aurum'
  }, [mode])

  function switchMode(next) {
    setMode(next)
    setError('')
  }

  async function submit(event) {
    event.preventDefault()
    const cleanName = name.trim().replace(/\s+/g, ' ')
    const cleanEmail = email.trim().toLowerCase()
    if (mode === 'signup') {
      if (cleanName.length < 2) {
        setError('Enter the name you want on the ledger.')
        return
      }
      if (cleanName.length > 60) {
        setError('Keep your name under 60 characters.')
        return
      }
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      setError('Enter a valid email address.')
      return
    }
    if (password.length < 6) {
      setError('Use a password of at least 6 characters.')
      return
    }
    setPending(true)
    try {
      if (mode === 'signup') await signup({ name: cleanName, email: cleanEmail, password })
      else await login({ email: cleanEmail, password })
    } catch (err) {
      setError(err.message || 'Could not sign you in.')
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.15fr_0.85fr]">
      <section className="relative flex flex-col justify-between overflow-hidden bg-sidebar px-6 py-10 text-ivory sm:px-10 lg:px-14 lg:py-12">
        <div className="pointer-events-none absolute -right-20 top-16 h-72 w-72 rounded-full bg-gold/10 blur-3xl" />
        <div>
          <p className="font-serif text-4xl text-ivory">
            Aurum<span className="text-gold">.</span>
          </p>
          <p className="mt-2 text-[0.68rem] uppercase tracking-[0.28em] text-gold">Private ledger</p>
        </div>
        <div className="relative max-w-xl py-12">
          <h1 className="font-serif text-5xl leading-[0.95] font-medium sm:text-6xl">
            Know where every rupee goes.
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-ivory/70">
            Income, category budgets, and a six-month cashflow picture. Built like a private bank screen, saved to your account.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-ivory/80">
            {['Monthly budgets with 80% and 100% alerts', 'Income against spending, category by category', 'Statements you can download as PDF or CSV'].map((item) => (
              <li key={item} className="flex items-center gap-3">
                <span className="h-1.5 w-1.5 rounded-full bg-gold" />
                {item}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-[0.68rem] uppercase tracking-[0.22em] text-ivory/45">PKR · Private ledger · Your account</p>
      </section>

      <section className="grid place-items-center bg-ivory px-6 py-12 dark:bg-ink">
        <form onSubmit={submit} className="w-full max-w-md" noValidate>
          <p className={label}>{mode === 'login' ? 'Welcome' : 'New ledger'}</p>
          <h2 className="mt-3 font-serif text-4xl text-midnight dark:text-ivory">
            {mode === 'login' ? 'Open your ledger' : 'Create your ledger'}
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-midnight/60 dark:text-ivory/60">
            {mode === 'login'
              ? 'Sign in with your email. Each ledger is private to that account.'
              : 'A new ledger starts empty. After you sign in, Load Demo Data fills June through November 2026.'}
          </p>

          {mode === 'signup' ? (
            <label className="mt-8 block" htmlFor="signup-name">
              <span className="mb-2 block text-sm font-medium">Name</span>
              <input
                id="signup-name"
                className={field}
                value={name}
                autoFocus
                autoComplete="name"
                placeholder="Enter your name"
                onChange={(event) => {
                  setName(event.target.value)
                  setError('')
                }}
              />
            </label>
          ) : null}

          <label className={mode === 'signup' ? 'mt-4 block' : 'mt-8 block'} htmlFor="auth-email">
            <span className="mb-2 block text-sm font-medium">Email</span>
            <input
              id="auth-email"
              className={field}
              type="email"
              value={email}
              autoFocus={mode === 'login'}
              autoComplete="email"
              placeholder="you@email.com"
              onChange={(event) => {
                setEmail(event.target.value)
                setError('')
              }}
            />
          </label>

          <label className="mt-4 block" htmlFor="auth-password">
            <span className="mb-2 block text-sm font-medium">Password</span>
            <input
              id="auth-password"
              className={field}
              type="password"
              value={password}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              placeholder="At least 6 characters"
              onChange={(event) => {
                setPassword(event.target.value)
                setError('')
              }}
            />
          </label>

          {error ? <p className="mt-2 text-sm text-expense">{error}</p> : null}
          <button className={`${btnGold} mt-6 w-full py-3`} type="submit" disabled={pending}>
            {pending ? 'Please wait' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          <button
            type="button"
            className="mt-4 text-sm font-medium text-gold-deep hover:text-gold dark:text-gold"
            onClick={() => switchMode(mode === 'login' ? 'signup' : 'login')}
          >
            {mode === 'login' ? 'Create an account' : 'Already have an account? Sign in'}
          </button>
        </form>
      </section>
    </div>
  )
}
