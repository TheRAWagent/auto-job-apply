import { useState } from "react"
import {
  CheckIcon,
} from "lucide-react"
import {
  Stepper,
  StepperContent,
  StepperIndicator,
  StepperItem,
  StepperNav,
  StepperPanel,
  StepperSeparator,
  StepperTrigger,
} from "@/components/reui/stepper"
import { useExtensionStore } from "@/store"
import { ApiKeyStep } from "./api-key-step"
import { PasswordStep } from "./password-step"
import { Header } from "./header"

type Step = 1 | 2

export function Onboarding() {
  const [step, setStep] = useState<Step>(1)
  const storage = useExtensionStore((state) => state.getSecureStorage)();
  const goToHome = useExtensionStore((state) => state.goToHome)

  const handleFinish = () => {
    goToHome()
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card text-card-foreground shadow-lg">
      <Header />
      <Stepper
        value={step}
        onValueChange={(value) => setStep(value as Step)}
        indicators={{
          completed: <CheckIcon className="size-3.5 text-green-700" />,
        }}
      >
        <StepperNav className="flex py-4 px-10 w-full">
          <StepperItem step={1}>
            <StepperTrigger>
              <StepperIndicator>1</StepperIndicator>
            </StepperTrigger>
            <StepperSeparator />
          </StepperItem>
          <StepperItem step={2}>
            <StepperTrigger>
              <StepperIndicator>2</StepperIndicator>
            </StepperTrigger>
          </StepperItem>
        </StepperNav>
        <StepperPanel>
          <StepperContent value={1}>
            <PasswordStep storage={storage} onContinue={() => setStep(2)} />
          </StepperContent>
          <StepperContent value={2}>
            <ApiKeyStep storage={storage} onFinish={handleFinish} />
          </StepperContent>
        </StepperPanel>
      </Stepper>
    </div>
  )
}
