import { ChatModelRequestBody } from "@/model/types/model";
import { ChatModel } from "../ChatModel";

export class Tongyi extends ChatModel {
  constructor(config: ChatModelRequestBody) {
    super(config);
  }
}
