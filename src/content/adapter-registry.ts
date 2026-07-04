import { DefaultFormAdapter } from "./adapters/default-form-adapter";
import type { FormAdapter } from "./form-adapter";

export class AdapterRegistry {
  private static adapters: FormAdapter[] = [];

  static resolve(url: URL): FormAdapter {
    return (
      this.adapters.find(a => a.canHandle(url))
      ?? new DefaultFormAdapter()
    );
  }
}
