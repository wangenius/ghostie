/**
 * 生成一个唯一的ID
 * @returns 使用UUID v4生成的唯一ID
 */
import { v4 as uuidv4 } from "uuid";

export class Generator {
  static id() {
    return uuidv4();
  }
}

export const gen = Generator;
