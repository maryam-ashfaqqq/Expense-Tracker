import { FinanceProvider, useFinance } from './context/FinanceContext.jsx'
import { LoginScreen } from './components/LoginScreen.jsx'
import { Shell } from './components/Shell.jsx'

function Boot() {
  return (
    <div className="grid min-h-screen place-items-center bg-ivory text-midnight dark:bg-ink dark:text-ivory">
      <p className="font-serif text-5xl">
        Aurum<span className="text-gold">.</span>
      </p>
    </div>
  )
}

function Gate() {
  const { user, booting } = useFinance()
  if (booting) return <Boot />
  if (!user) return <LoginScreen />
  return <Shell />
}

export default function App() {
  return (
    <FinanceProvider>
      <Gate />
    </FinanceProvider>
  )
}
