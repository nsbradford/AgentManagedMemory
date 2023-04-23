import {
  OpenAIApi,
  ChatCompletionRequestMessage,
  Configuration,
} from 'openai';

const INVALID_JSON = 'INVALID_JSON';
const FINAL_ANSWER = 'Final Answer'
export interface AgentAction {
  thought: string;
  tool: string;
  toolInput: string;
  raw: string;
};

export interface AgentStep {
  action: AgentAction;
  result: string;
};

export interface Tool {
  name: string;
  call(arg: string): Promise<string>;
}

export interface MemoryEntry {
  id: string; // UUID
  contentLines: string[];
}

export interface State {
  steps: AgentStep[];
  memory: string[];
}

class ReadTool implements Tool {
  name = 'read';
  call(arg: string): Promise<string> {
    // TODO: read from memory
    return Promise.resolve(arg);
  }
}

class FinalAnswerTool implements Tool {
  name = FINAL_ANSWER;
  call(arg: string): Promise<string> {
    return Promise.resolve(arg);
  }
}

async function buildChatMessages(state: State): Promise<ChatCompletionRequestMessage[]> {
  return [
    {
      role: 'system',
      content: 'Please do X.',
    },
    {
      role: 'user',
      content: state.memory.join('\n'),
    }
  ];
}


/**
 * Guaranteed to be called only with valid history
 */
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
    const prompt = await buildChatMessages(state);
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