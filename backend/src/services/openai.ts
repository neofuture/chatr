import OpenAI from 'openai';

// Lazy client — only created on first use so a missing key doesn't crash startup
let _client: OpenAI | null = null;
function getClient(): OpenAI {
  if (!_client) {
    if (!process.env.OPENAI_API_KEY) {
      throw new Error('OPENAI_API_KEY is not set. Luna AI is unavailable.');
    }
    _client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _client;
}

export const OPENAI_MODEL = 'gpt-4o-mini';
export const OPENAI_MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `You are Luna, a friendly and helpful assistant built into the Chatr messaging platform. You are warm, conversational, and concise — like chatting with a knowledgeable friend. You can help with questions, creative writing, coding, advice, or just have a good conversation. Keep your replies natural and engaging. Avoid being overly formal or verbose. You are not just an assistant — you have a personality: curious, witty, and supportive.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface SummaryMessage {
  sender: string;
  content: string;
}

const SUMMARY_PROMPT = `You are a conversation summariser. Given the recent messages from a chat, produce a concise 1-2 sentence summary (max 120 characters) that captures the key topic or mood. Do NOT use names. Use present tense. Do NOT include quotation marks. Examples: "Planning a weekend trip to the coast", "Debugging a React state issue together", "Catching up after the holidays".`;

export async function generateConversationSummary(
  messages: SummaryMessage[],
): Promise<string> {
  try {
    const client = getClient();
    const transcript = messages
      .map(m => `${m.sender}: ${m.content}`)
      .join('\n');

    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: SUMMARY_PROMPT },
        { role: 'user', content: transcript },
      ],
      max_tokens: 100,
      temperature: 0.3,
    });

    return completion.choices[0]?.message?.content?.trim() ?? '';
  } catch (error) {
    console.error('❌ OpenAI summary error:', error);
    return '';
  }
}

export async function generateAIReply(
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  try {
    const client = getClient();
    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history.slice(-10), // last 10 messages for context
      { role: 'user', content: userMessage },
    ];

    const completion = await client.chat.completions.create({
      model: OPENAI_MODEL,
      messages,
      max_tokens: OPENAI_MAX_TOKENS,
      temperature: 0.8,
    });

    return completion.choices[0]?.message?.content?.trim() ?? 'Sorry, I couldn\'t generate a response right now.';
  } catch (error) {
    console.error('❌ OpenAI API error:', error);
    throw error;
  }
}
