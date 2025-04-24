export class ContextMemory {
  data: Record<string, any>;
  env: Record<string, string>;
  constructor() {
    this.data = {};
    this.env = {};
  }
}
