import { Echo } from "echo-state";

export class Env {
  static store = new Echo<Record<string, string>>(
    {},
    {
      name: "env",
      sync: true,
    }
  );

  static use = this.store.use.bind(this.store);

  static set(key: string, value: string) {
    this.store.current[key] = value;
  }

  static get(key: string) {
    return this.store.current[key];
  }
  static delete(key: string) {
    this.store.delete(key);
  }

  static clear() {
    this.store.reset();
  }
}
