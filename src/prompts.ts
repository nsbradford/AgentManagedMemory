import { Tool } from "./types";

export const INVALID_JSON = 'INVALID_JSON';
export const FINAL_ANSWER = 'Final Answer'

export function buildSystem(prefix: string, suffix: string, tools: Tool[]): string {
  let systemPrompt = prefix + '\n--';

  for (const tool of tools) {
      let toolPrompt = `${tool.name}: ${tool.description}\n`;
      for (const example of tool.examples ?? []) {
        toolPrompt += JSON.stringify(example) + '\n';
      }
      systemPrompt += toolPrompt;
      systemPrompt += '--\n';
  }

  systemPrompt += suffix;
  return systemPrompt;
}

const suffix = `The way you use the tools is by specifying a json blob, denoted below by $JSON_BLOB. Specifically, this $JSON_BLOB should have a "thought" key (with your thought process in detail about what to do next and why), an "action" key (with the name of the tool to use) and a "action_input" key (with the input to the tool going here). 
The $JSON_BLOB should only contain a SINGLE action, do NOT return a list of multiple actions.`

export function buildBaseSystem(tools: Tool[]): string {
  return buildSystem(`You have access to the following tools:`, suffix, tools);
}
