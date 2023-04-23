import { FINAL_ANSWER } from "./prompts";
import { Tool } from "./types";

export class ReadTool implements Tool {
  name = 'read';
  description = 'Read from memory';
  examples = [
    // TODO
    // {
    //   thought: 'I think the answer is 42',
    //   tool: 'read',
    //   toolInput: '42',
    // }
  ]
  call(arg: string): Promise<string> {
    // TODO: read from memory
    return Promise.resolve(arg);
  }
}
  
export class FinalAnswerTool implements Tool {
  name = FINAL_ANSWER;
  description = 'Return the final answer';
  examples = [
    {
      thought: 'I think the answer is 42',
      tool: FINAL_ANSWER,
      toolInput: '42',
    }
  ]
  call(arg: string): Promise<string> {
      return Promise.resolve(arg);
  }
}
