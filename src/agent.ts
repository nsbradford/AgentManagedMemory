import {
  OpenAIApi,
  ChatCompletionRequestMessage,
  Configuration,
} from 'openai';
import { State, AgentAction, Tool } from './types';
import { FinalAnswerTool, ReadTool } from './tools';
import { FINAL_ANSWER, INVALID_JSON, buildBaseSystem } from './prompts';


async function buildChatMessages(state: State, tools: Tool[]): Promise<ChatCompletionRequestMessage[]> {
  return [
    {
      role: 'system',
      content: buildBaseSystem(tools),
    },
    {
      role: 'user',
      content: state.memory.join('\n'),
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

async function runAgent() {
  const tools = [new ReadTool(), new FinalAnswerTool()];
  const state: State = {
    steps: [],
    memory: []
  }

  while (true) {
    const prompt = await buildChatMessages(state, tools);
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
    const step = { action, result };
    state.steps.push(step)
    if (step.action.tool === FINAL_ANSWER) {
      console.log(`Agent returned final answer: ${result}`);
      break;
    }
  }
}

runAgent();