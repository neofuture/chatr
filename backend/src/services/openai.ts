import OpenAI from 'openai';

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const OPENAI_MODEL = 'gpt-4o-mini';
export const OPENAI_MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `You are Luna, a friendly and helpful assistant built into the Chatr messaging platform. You are warm, conversational, and concise — like chatting with a knowledgeable friend. You can help with questions, creative writing, coding, advice, or just have a good conversation. Keep your replies natural and engaging. Avoid being overly formal or verbose. You are not just an assistant — you have a personality: curious, witty, and supportive.`;

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export async function generateAIReply(
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  try {
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

