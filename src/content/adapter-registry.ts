import { BinaryAdapter } from "./adapters/binary-adapter";
import { DefaultFormAdapter } from "./adapters/default-form-adapter";
import { GreenhouseAdapter } from "./adapters/greenhouse-adapter";
import type { FormAdapter } from "./form-adapter";

export class AdapterRegistry {
  private static adapters: FormAdapter[] = [
    new GreenhouseAdapter(),
    new BinaryAdapter()
  ];

  static resolve(url: URL): FormAdapter {
    return (
      this.adapters.find(a => a.canHandle(url))
      ?? new DefaultFormAdapter()
    );
  }
}
