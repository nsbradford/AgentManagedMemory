import {
  OpenAIApi,
  ChatCompletionRequestMessage,
  Configuration,
} from 'openai';
import { AgentAction, Tool, MemoryEntry, Memory } from './types';
import { FinalAnswerTool, ReadTool } from './tools';
import { FINAL_ANSWER, INVALID_JSON, buildBaseSystem } from './prompts';
import { v4 } from 'uuid';


async function buildChatMessages(memory: Memory, tools: Tool[]): Promise<ChatCompletionRequestMessage[]> {
  return [
    {
      role: 'system',
      content: buildBaseSystem(tools),
    },
    {
      role: 'user',
      content: memory.join('\n'),
    }
  ];
}

async function getLLMAction(messages: ChatCompletionRequestMessage[]): Promise<AgentAction> {
  const apiKey = process.env.OPENAI_API_KEY ?? 'MISSING KEY';
  const openai = new OpenAIApi(new Configuration({ apiKey }));
  console.log(`Calling LLM with messages:`, messages)
  console.log(`Waiting...`)
  const response /* AxiosResponse<CreateChatCompletionResponse, any> */ =
    await openai.createChatCompletion({
      model: 'gpt-4',
      messages,
      temperature: 0,
    });
  
  const text = response.data.choices[0].message!.content
  console.log(`LLM response:\n---\n${text}\n---\n`)
  try {
    return JSON.parse(text);
  } catch (e) {
    return {
      thought: '',
      tool: INVALID_JSON,
      toolInput: '',
      raw: text,
    }
  } 
}

async function summarizeMemory(memory: Memory): Promise<Memory> {
  return [];
}

function stepToMemoryEntry(action: AgentAction, result: string): MemoryEntry {
  const step = { action, result };
  return {
    id: v4(),
    currentContent: result,
    step,
  };
}

async function runAgent() {
  const tools = [new ReadTool(), new FinalAnswerTool()];
  let memory: Memory = []
  while (true) {
    const prompt = await buildChatMessages(memory, tools);
    const action = await getLLMAction(prompt);
    let result;
    if (action.tool === INVALID_JSON) {
      result = `Must return with valid JSON.`
    } else {
      const tool = tools.find(t => t.name === action.tool);
      result =
        tool
          ? await tool.call(action.toolInput)
          : `Tool not found: '${action.tool}'. Valid tools: ${tools.map(t => t.name).join(', ')}`;
    }
    if (action.tool === FINAL_ANSWER) {
      console.log(`Agent returned final answer: ${result}`);
      break;
    }
    memory.push((stepToMemoryEntry(action, result)))
    memory = await summarizeMemory(memory);
  }
}

runAgent();