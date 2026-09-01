// توابع کمکی برای کار با دیتابیس Cloudflare D1

export async function registerGroup(env, chatId, title) {
  await env.DB.prepare(
    `INSERT INTO groups (chat_id, title, registered_at)
     VALUES (?, ?, ?)
     ON CONFLICT(chat_id) DO UPDATE SET title = excluded.title`
  )
    .bind(chatId, title, Date.now())
    .run();
}

export async function isGroupRegistered(env, chatId) {
  const row = await env.DB.prepare(`SELECT chat_id FROM groups WHERE chat_id = ?`)
    .bind(chatId)
    .first();
  return !!row;
}

export async function setLock(env, chatId, lockType, isLocked) {
  await env.DB.prepare(
    `INSERT INTO locks (chat_id, lock_type, is_locked)
     VALUES (?, ?, ?)
     ON CONFLICT(chat_id, lock_type) DO UPDATE SET is_locked = excluded.is_locked`
  )
    .bind(chatId, lockType, isLocked ? 1 : 0)
    .run();
}

export async function isLocked(env, chatId, lockType) {
  const row = await env.DB.prepare(
    `SELECT is_locked FROM locks WHERE chat_id = ? AND lock_type = ?`
  )
    .bind(chatId, lockType)
    .first();
  return !!(row && row.is_locked === 1);
}

export async function getAllLocks(env, chatId) {
  const { results } = await env.DB.prepare(
    `SELECT lock_type, is_locked FROM locks WHERE chat_id = ?`
  )
    .bind(chatId)
    .all();
  return results || [];
}

export async function addToWhitelist(env, chatId, userId) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO whitelist (chat_id, user_id) VALUES (?, ?)`
  )
    .bind(chatId, userId)
    .run();
}

export async function removeFromWhitelist(env, chatId, userId) {
  await env.DB.prepare(
    `DELETE FROM whitelist WHERE chat_id = ? AND user_id = ?`
  )
    .bind(chatId, userId)
    .run();
}

export async function isWhitelisted(env, chatId, userId) {
  const row = await env.DB.prepare(
    `SELECT user_id FROM whitelist WHERE chat_id = ? AND user_id = ?`
  )
    .bind(chatId, userId)
    .first();
  return !!row;
}

export async function addWarning(env, chatId, userId) {
  await env.DB.prepare(
    `INSERT INTO warnings (chat_id, user_id, count, last_warning_at)
     VALUES (?, 1, ?)
     ON CONFLICT(chat_id, user_id) DO UPDATE SET
       count = count + 1,
       last_warning_at = excluded.last_warning_at`
  )
    .bind(chatId, userId, Date.now())
    .run();

  const row = await env.DB.prepare(
    `SELECT count FROM warnings WHERE chat_id = ? AND user_id = ?`
  )
    .bind(chatId, userId)
    .first();
  return row ? row.count : 1;
}

export async function resetWarnings(env, chatId, userId) {
  await env.DB.prepare(
    `DELETE FROM warnings WHERE chat_id = ? AND user_id = ?`
  )
    .bind(chatId, userId)
    .run();
}

// ثبت یک پیام هشدار برای حذف خودکار بعد از N میلی‌ثانیه
export async function schedulePendingDeletion(env, chatId, messageId, delayMs) {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO pending_deletions (chat_id, message_id, delete_at)
     VALUES (?, ?, ?)`
  )
    .bind(chatId, messageId, Date.now() + delayMs)
    .run();
}

// گرفتن لیست پیام‌هایی که زمان حذفشون رسیده (برای Cron Trigger)
export async function getExpiredDeletions(env) {
  const { results } = await env.DB.prepare(
    `SELECT chat_id, message_id FROM pending_deletions WHERE delete_at <= ?`
  )
    .bind(Date.now())
    .all();
  return results || [];
}

export async function removePendingDeletion(env, chatId, messageId) {
  await env.DB.prepare(
    `DELETE FROM pending_deletions WHERE chat_id = ? AND message_id = ?`
  )
    .bind(chatId, messageId)
    .run();
}
