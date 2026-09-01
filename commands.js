// دستورات فارسی مدیریتی مثل: !لینک قفل  و  !لینک آزاد

import { setLock, getAllLocks, addToWhitelist, removeFromWhitelist, registerGroup } from "./db.js";
import { sendMessage, isAdmin } from "./telegram.js";
import { LOCK_LABELS } from "./filters.js";

// نگاشت کلمه‌ی فارسی به نوع قفل داخلی
const PERSIAN_TO_TYPE = {
  "لینک": "link",
  "فوروارد": "forward",
  "فوروارد کانال": "forward_channel",
  "عکس": "photo",
  "فیلم": "video",
  "فایل": "file",
  "گیف": "gif",
  "استیکر": "sticker",
  "ایموجی": "emoji",
  "شماره": "phone",
  "لوکیشن": "location",
  "متن": "text",
  "نظرسنجی": "poll",
};

/**
 * پردازش دستورات متنی که با ! شروع می‌شن
 * برمی‌گردونه: true اگر پیام یک دستور بود و پردازش شد
 */
export async function handleTextCommand(env, message) {
  const text = message.text?.trim();
  if (!text || !text.startsWith("!")) return false;

  const chatId = message.chat.id;
  const userId = message.from.id;

  // فقط ادمین‌ها اجازه‌ی تغییر قفل‌ها رو دارن
  const admin = await isAdmin(env, chatId, userId);
  if (!admin) {
    await sendMessage(env, chatId, "⛔️ فقط ادمین‌های گروه می‌تونن قفل‌ها رو تغییر بدن.");
    return true;
  }

  const body = text.slice(1).trim(); // حذف !
  const parts = body.split(/\s+/);
  const action = parts[parts.length - 1]; // آخرین کلمه: قفل یا آزاد
  const label = parts.slice(0, -1).join(" "); // بقیه: نوع قفل

  const lockType = PERSIAN_TO_TYPE[label];
  if (!lockType) return false; // دستور شناخته‌شده نیست

  if (action === "قفل") {
    await setLock(env, chatId, lockType, true);
    await sendMessage(env, chatId, `🔒 قفل «${label}» فعال شد.`);
    return true;
  }
  if (action === "آزاد") {
    await setLock(env, chatId, lockType, false);
    await sendMessage(env, chatId, `🔓 قفل «${label}» برداشته شد.`);
    return true;
  }

  return false;
}

/**
 * پردازش دستورات اسلش مثل /start /id
 */
export async function handleSlashCommand(env, message) {
  const text = message.text?.trim();
  if (!text || !text.startsWith("/")) return false;

  const chatId = message.chat.id;
  const userId = message.from.id;
  const command = text.split(/\s+/)[0].split("@")[0]; // حذف پارامتر و @botname

  switch (command) {
    case "/start":
      await sendMessage(
        env,
        chatId,
        "🤖 سلام! من مبصر شیپورک هستم.\nمنو به گروه اضافه کن و ادمینم کن تا شروع به مدیریت کنم."
      );
      return true;

    case "/id":
      await sendMessage(
        env,
        chatId,
        `🆔 شناسه‌ی چت شما: <code>${chatId}</code>\n🆔 شناسه‌ی کاربری شما: <code>${userId}</code>`
      );
      return true;

    case "/ثبت":
    case "/register": {
      const admin = await isAdmin(env, chatId, userId);
      if (!admin) {
        await sendMessage(env, chatId, "⛔️ فقط ادمین می‌تونه گروه رو ثبت کنه.");
        return true;
      }
      await registerGroup(env, chatId, message.chat.title || "بدون‌نام");
      await sendMessage(env, chatId, "✅ گروه با موفقیت ثبت شد.");
      return true;
    }

    case "/قفلها":
    case "/locks": {
      const locks = await getAllLocks(env, chatId);
      if (locks.length === 0) {
        await sendMessage(env, chatId, "در حال حاضر هیچ قفلی فعال نیست.");
        return true;
      }
      const lines = locks
        .filter((l) => l.is_locked === 1)
        .map((l) => `🔒 ${LOCK_LABELS[l.lock_type] || l.lock_type}`);
      await sendMessage(
        env,
        chatId,
        lines.length ? lines.join("\n") : "در حال حاضر هیچ قفلی فعال نیست."
      );
      return true;
    }

    default:
      return false;
  }
}
