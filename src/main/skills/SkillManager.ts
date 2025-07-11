/* 技能方法接口 */
import { ToolParameters } from "@/toolkit/types";
import { Agent } from "@/agent/Agent";

/** 方法元数据 */
export interface Skill {
  name: string;
  description: string;
  params: ToolParameters;
  execute: (params: Record<string, any>, agent: Agent) => any;
}

/** 方法管理器 */
export const SkillManager = {
  /** 已注册的方法 */
  skills: {} as Record<string, Skill>,

  /** 获取所有已注册的技能 */
  getSkills(): Record<string, Skill> {
    return this.skills;
  },
  /** 注册技能 */
  register(type: string, skill: Skill): void {
    this.skills[type] = skill;
  },
  /** 获取指定的技能 */
  getSkill(type: string): Skill | undefined {
    return this.skills[type];
  },
  /** 执行指定方法 */
  execute(
    skillType: string,
    params: Record<string, any> = {},
    agent: Agent,
  ): any {
    const skill = this.getSkill(skillType);
    if (!skill) {
      throw new Error(`技能 ${skillType} 不存在`);
    }
    return skill.execute(params, agent);
  },
};
