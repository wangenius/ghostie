import { ModelInfo } from '@common/types';
import { ChatModel } from '../model/ChatModel';
import { ModelManager } from './ModelManager';

export class ChatManager {
  static current = new ChatModel();

  static create(
    info: ModelInfo | string,
    system: string = '你是一个AI助手, 请简洁回答用户的问题'
  ) {
    if (typeof info === 'string') {
      const model = ModelManager.get(info);
      this.current = new ChatModel(model).system(system);
    } else {
      this.current = new ChatModel(info).system(system);
    }

    return this.current;
  }
}
