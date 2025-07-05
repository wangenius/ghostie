import { Echo } from "echo-state";

export class ModelKey {
  private static store = new Echo<Record<string, string>>({}).localStorage({
    name: "providers_api_keys",
  });

  static use = this.store.use.bind(this.store);

  static set(provider: string, key: string) {
    this.store.set((prev) => ({ ...prev, [provider]: key }));
  }

  static get(provider: string) {
    return this.store.current[provider];
  }
}
