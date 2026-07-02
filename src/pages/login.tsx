import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useExtensionStore } from "@/store"
import { logger } from "@/lib/logger"

const LOG_CONTEXT = "login";

export function Login() {
  const goToHome = useExtensionStore((state) => state.goToHome)
  const setLoggedIn = useExtensionStore((state) => state.setLoggedIn)
  const storage = useExtensionStore((state) => state.getSecureStorage)();
  const [password, setPassword] = useState("")

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    logger.info(LOG_CONTEXT, "Login attempt")

    try {
      const isValid = await storage.unlock(password);
      if (!isValid) {
        logger.warn(LOG_CONTEXT, "Login failed: invalid password")
        alert("Invalid password. Please try again.");
        return;
      }
      await storage.createSession(password);
      await storage.syncSessionCredentials();
      setLoggedIn(true);
      logger.info(LOG_CONTEXT, "Login succeeded")
      goToHome()
    } catch (error) {
      logger.reportError({
        context: LOG_CONTEXT,
        message: "Login failed",
        error,
      })
      alert("An error occurred during login. Please try again.");
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-muted p-4">
      <div className="w-full max-w-sm rounded-4xl border bg-background p-6 shadow-sm">
        <h1 className="mb-6 text-center text-2xl font-semibold text-foreground">
          Login
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              setPassword(e.target.value)
            }
          />
          <Button type="submit">Login</Button>
        </form>
        <Button
          variant="ghost"
          className="mt-4 w-full"
          onClick={goToHome}
          type="button"
        >
          Back to Home
        </Button>
      </div>
    </div>
  )
}
