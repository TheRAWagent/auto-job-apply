import { useEffect, useState } from "react"
import { Home } from "@/pages/Home"
import { Login } from "@/pages/Login"
import { useExtensionStore } from "./store"
import { Onboarding } from "./components/onboarding"
import type { Page } from "./store/router-slice"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient()

function App() {
  const page = useExtensionStore((state) => state.page)
  const secureStorage = useExtensionStore((state) => state.secureStorage)
  const setPage = useExtensionStore((state) => state.setPage)
  const setLoggedIn = useExtensionStore((state) => state.setLoggedIn)
  const goToLogin = useExtensionStore((state) => state.goToLogin)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    const restoreSession = async () => {
      const initialized = await secureStorage.isInitialized()
      if (!initialized) {
        setPage("onboarding")
        setReady(true)
        return
      }

      const sessionPassword = await secureStorage.getSessionPassword()
      if (sessionPassword) {
        const ok = await secureStorage.unlock(sessionPassword)
        if (ok) {
          setLoggedIn(true)
          setReady(true)
          return
        }
      }

      setReady(true)
      if (page === "home") {
        goToLogin()
      }
    }

    void restoreSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const getPage = (page: Page) => {
    switch (page) {
      case "login":
        return <Login />
      case "onboarding":
        return <Onboarding />
      case "home":
      default:
        return <Home />
    }
  }

  if (!ready) {
    return null
  }

  return (
    <QueryClientProvider client={queryClient}>
      <div className="w-120">
        {getPage(page)}
      </div>
    </QueryClientProvider>
  )
}

export default App
