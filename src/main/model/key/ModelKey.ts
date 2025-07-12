
export class ModelKey {
  private static store = {} as Record<string, string>;

  static set(provider: string, key: string) {
    this.store[provider] = key;
  }

  static get(provider: string) {
    return this.store.current[provider];
  }
}
