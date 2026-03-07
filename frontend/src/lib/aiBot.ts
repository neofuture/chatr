/**
 * AI Bot constants — shared across the frontend.
 * The bot user ID is set via the NEXT_PUBLIC_AI_BOT_USER_ID environment variable.
 * Falls back to the local development bot ID.
 */
export const AI_BOT_USER_ID =
  process.env.NEXT_PUBLIC_AI_BOT_USER_ID || 'a4629855-ea4c-40b7-b58d-49af22debc5c';

export function isAIBot(userId: string): boolean {
  return userId === AI_BOT_USER_ID;
}

