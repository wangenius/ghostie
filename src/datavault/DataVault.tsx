import { gen } from "@/utils/generator";

export class DataVault {
  static vaults: Record<string, string> = {};

  static setDataVault(content: string = "") {
    const id = gen.id();
    this.vaults[id] = content;
    return id;
  }

  static getDataVault(id: string) {
    return this.vaults[id];
  }

  static deleteDataVault(id: string) {
    delete this.vaults[id];
  }
}
