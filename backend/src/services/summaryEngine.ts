import { PrismaClient } from '@prisma/client';
import { generateConversationSummary, type SummaryMessage } from './openai';

let _prisma: PrismaClient;
function getPrisma() {
  if (!_prisma) _prisma = new PrismaClient();
  return _prisma;
}

export function setSummaryPrisma(client: PrismaClient) { _prisma = client; }

const MIN_MESSAGES_FOR_SUMMARY = 10;
const REGEN_THRESHOLD = 10;
const MAX_MESSAGES_TO_SUMMARISE = 30;
const MIN_REGEN_INTERVAL_MS = 5 * 60 * 1000;

// ── DM conversations ──────────────────────────────────────────────────────────

export async function maybeRegenerateDMSummary(
  conversationId: string,
  participantA: string,
  participantB: string,
  existingSummaryCount?: number | null,
  existingSummaryGeneratedAt?: Date | null,
): Promise<void> {
  try {
    if (existingSummaryGeneratedAt && Date.now() - existingSummaryGeneratedAt.getTime() < MIN_REGEN_INTERVAL_MS) return;

    const prisma = getPrisma();

    const currentCount = await prisma.message.count({
      where: {
        deletedAt: null,
        OR: [
          { senderId: participantA, recipientId: participantB },
          { senderId: participantB, recipientId: participantA },
        ],
      },
    });

    if (!shouldRegenerate(currentCount, existingSummaryCount ?? null)) return;

    const messages = await prisma.message.findMany({
      where: {
        deletedAt: null,
        type: 'text',
        OR: [
          { senderId: participantA, recipientId: participantB },
          { senderId: participantB, recipientId: participantA },
        ],
      },
      orderBy: { createdAt: 'desc' },
      take: MAX_MESSAGES_TO_SUMMARISE,
      include: { sender: { select: { displayName: true, username: true } } },
    });

    if (messages.length < MIN_MESSAGES_FOR_SUMMARY) return;

    const formatted: SummaryMessage[] = messages
      .reverse()
      .map(m => ({
        sender: m.sender.displayName || m.sender.username.replace(/^@/, ''),
        content: m.content,
      }));

    const summary = await generateConversationSummary(formatted);
    if (!summary) return;

    await prisma.conversation.update({
      where: { id: conversationId },
      data: {
        summary,
        summaryMessageCount: currentCount,
        summaryGeneratedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('Summary generation error (DM):', err);
  }
}

// ── Group conversations ───────────────────────────────────────────────────────

export async function maybeRegenerateGroupSummary(
  groupId: string,
  existingSummaryCount?: number | null,
  existingSummaryGeneratedAt?: Date | null,
): Promise<void> {
  try {
    if (existingSummaryGeneratedAt && Date.now() - existingSummaryGeneratedAt.getTime() < MIN_REGEN_INTERVAL_MS) return;

    const prisma = getPrisma();

    const currentCount = await prisma.groupMessage.count({
      where: { groupId },
    });

    if (!shouldRegenerate(currentCount, existingSummaryCount ?? null)) return;

    const messages = await prisma.groupMessage.findMany({
      where: { groupId, type: 'text' },
      orderBy: { createdAt: 'desc' },
      take: MAX_MESSAGES_TO_SUMMARISE,
      include: { sender: { select: { displayName: true, username: true } } },
    });

    if (messages.length < MIN_MESSAGES_FOR_SUMMARY) return;

    const formatted: SummaryMessage[] = messages
      .reverse()
      .map(m => ({
        sender: m.sender.displayName || m.sender.username.replace(/^@/, ''),
        content: m.content,
      }));

    const summary = await generateConversationSummary(formatted);
    if (!summary) return;

    await prisma.group.update({
      where: { id: groupId },
      data: {
        summary,
        summaryMessageCount: currentCount,
        summaryGeneratedAt: new Date(),
      },
    });
  } catch (err) {
    console.error('Summary generation error (group):', err);
  }
}

// ── Shared logic ──────────────────────────────────────────────────────────────

function shouldRegenerate(
  currentCount: number,
  lastSummaryCount: number | null | undefined,
): boolean {
  if (currentCount < MIN_MESSAGES_FOR_SUMMARY) return false;
  if (lastSummaryCount == null) return true;
  return currentCount - lastSummaryCount >= REGEN_THRESHOLD;
}
