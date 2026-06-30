import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { ManageProfile } from "@/pages/manage-profile"
import "@/index.css"
import { QueryClient, QueryClientProvider } from "@tanstack/react-query"

const queryClient = new QueryClient()

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ManageProfile />
    </QueryClientProvider>
  </StrictMode>
)
