import { useEffect, useState } from "react"
import { Home } from "@/pages/home"
import { Login } from "@/pages/login"
import { Settings } from "@/pages/settings"
import { useExtensionStore } from "./store"
import { Onboarding } from "./components/onboarding"
import type { Page } from "./store/router-slice"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { logger } from "@/lib/logger"

const LOG_CONTEXT = "app";

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
      try {
        const initialized = await secureStorage.isInitialized()
        if (!initialized) {
          logger.info(LOG_CONTEXT, "Storage not initialized; showing onboarding")
          setPage("onboarding")
          setReady(true)
          return
        }

        const sessionPassword = await secureStorage.getSessionPassword()
        if (sessionPassword) {
          const ok = await secureStorage.unlock(sessionPassword)
          if (ok) {
            logger.info(LOG_CONTEXT, "Session restored")
            setLoggedIn(true)
            setReady(true)
            return
          }

          logger.warn(LOG_CONTEXT, "Stored session password did not unlock storage")
        }

        setReady(true)
        if (page !== "login" && page !== "onboarding") {
          goToLogin()
        }
      } catch (error) {
        logger.reportError({
          context: LOG_CONTEXT,
          message: "Failed to restore session",
          error,
        })
        setReady(true)
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
      case "settings":
        return <Settings />
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
