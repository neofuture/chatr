import { prisma } from '../lib/prisma';
import { generateConversationSummary, type SummaryMessage } from './openai';

const MIN_MESSAGES_FOR_SUMMARY = 10;
const REGEN_THRESHOLD = 10;
const MAX_MESSAGES_TO_SUMMARISE = 30;
const MIN_REGEN_INTERVAL_MS = 5 * 60 * 1000;

// Process summary regenerations one at a time so they don't saturate the
// event loop or create row-lock contention with normal CRUD operations.
const _queue: Array<() => Promise<void>> = [];
let _processing = false;

async function _drain() {
  if (_processing) return;
  _processing = true;
  while (_queue.length > 0) {
    const task = _queue.shift()!;
    try { await task(); } catch { /* errors handled inside each task */ }
    // Yield to the event loop between tasks so HTTP requests aren't starved
    await new Promise(r => setImmediate(r));
  }
  _processing = false;
}

function enqueue(task: () => Promise<void>) {
  _queue.push(task);
  _drain();
}

// ── DM conversations ──────────────────────────────────────────────────────────

export function maybeRegenerateDMSummary(
  conversationId: string,
  participantA: string,
  participantB: string,
  existingSummaryCount?: number | null,
  existingSummaryGeneratedAt?: Date | null,
): void {
  if (existingSummaryGeneratedAt && Date.now() - existingSummaryGeneratedAt.getTime() < MIN_REGEN_INTERVAL_MS) return;

  enqueue(async () => {
    try {
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
  });
}

// ── Group conversations ───────────────────────────────────────────────────────

export function maybeRegenerateGroupSummary(
  groupId: string,
  existingSummaryCount?: number | null,
  existingSummaryGeneratedAt?: Date | null,
): void {
  if (existingSummaryGeneratedAt && Date.now() - existingSummaryGeneratedAt.getTime() < MIN_REGEN_INTERVAL_MS) return;

  enqueue(async () => {
    try {
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
  });
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
