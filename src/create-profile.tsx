import { StrictMode } from "react"
import { createRoot } from "react-dom/client"
import { CreateProfile } from "@/pages/create-profile"
import "@/index.css"

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <CreateProfile />
  </StrictMode>
)
