import 'dotenv/config';
import { asc, eq } from 'drizzle-orm';
import { db, pool } from '../src/db';
import { messages } from '../src/db/schema';
import { dispatchExternalMessage } from '../src/lib/messageProvider';

async function main() {
  const queue = await db.select().from(messages).where(eq(messages.status, 'QUEUED')).orderBy(asc(messages.createdAt)).limit(100);
  for (const message of queue) {
    if (!message.recipient) {
      await db.update(messages).set({ status: 'FAILED', failureReason: 'Recipient is missing.' }).where(eq(messages.id, message.id));
      continue;
    }
    try {
      const result = await dispatchExternalMessage({ channel: message.channel, recipient: message.recipient, subject: message.subject, body: message.body });
      await db.update(messages).set({ status: 'SENT', providerId: result.providerId, cost: result.cost, sentAt: new Date() }).where(eq(messages.id, message.id));
    } catch (error) {
      await db.update(messages).set({ status: 'FAILED', failureReason: error instanceof Error ? error.message.slice(0, 1000) : 'Provider error' }).where(eq(messages.id, message.id));
    }
  }
  console.log(`Processed ${queue.length} queued message(s).`);
  await pool.end();
}

main().catch(async (error) => { console.error(error); await pool.end(); process.exit(1); });
