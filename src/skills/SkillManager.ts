import { Skill } from "./Skill";

export interface SkillProps {
  name: string;
  description: string;
}

/** Skill 管理器 */
export class SkillManager {
  /** 已注册的 Engine */
  private static readonly skills: Record<string, Skill> = {};

  /** 注册 Engine */
  public static register(type: string, skill: Skill): void {
    this.skills[type] = skill;
  }

  /** 获取指定的 Engine */
  public static getSkill(type: string): Skill | undefined {
    return this.skills[type];
  }
}
