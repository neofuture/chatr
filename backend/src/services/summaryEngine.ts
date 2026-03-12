import { PrismaClient } from '@prisma/client';
import { generateConversationSummary, type SummaryMessage } from './openai';

const prisma = new PrismaClient();

const MIN_MESSAGES_FOR_SUMMARY = 10;
const REGEN_THRESHOLD = 10;
const MAX_MESSAGES_TO_SUMMARISE = 30;

// ── DM conversations ──────────────────────────────────────────────────────────

export async function maybeRegenerateDMSummary(
  conversationId: string,
  participantA: string,
  participantB: string,
): Promise<void> {
  try {
    const convo = await prisma.conversation.findUnique({
      where: { id: conversationId },
      select: { summaryMessageCount: true, summaryGeneratedAt: true },
    });
    if (!convo) return;

    const currentCount = await prisma.message.count({
      where: {
        deletedAt: null,
        OR: [
          { senderId: participantA, recipientId: participantB },
          { senderId: participantB, recipientId: participantA },
        ],
      },
    });

    if (!shouldRegenerate(currentCount, convo.summaryMessageCount)) return;

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
): Promise<void> {
  try {
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      select: { summaryMessageCount: true, summaryGeneratedAt: true },
    });
    if (!group) return;

    const currentCount = await prisma.groupMessage.count({
      where: { groupId },
    });

    if (!shouldRegenerate(currentCount, group.summaryMessageCount)) return;

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
