// نقطه‌ی ورود اصلی: تمام پیام‌های تلگرام از اینجا وارد می‌شن (Webhook)

import { checkMessage, LOCK_LABELS } from "./filters.js";
import { sendMessage, deleteMessage, isAdmin } from "./telegram.js";
import {
  addWarning,
  isWhitelisted,
  schedulePendingDeletion,
  getExpiredDeletions,
  removePendingDeletion,
} from "./db.js";
import { handleTextCommand, handleSlashCommand } from "./commands.js";

const WARNING_LIMIT = 3; // بعد از چند هشدار، می‌تونید منطق حذف/بن اضافه کنید
const WARNING_AUTO_DELETE_MS = 10_000; // حذف پیام هشدار بعد از ۱۰ ثانیه

export default {
  async fetch(request, env, ctx) {
    // فقط درخواست POST (که تلگرام برای هر پیام می‌فرسته) پردازش می‌شه
    if (request.method !== "POST") {
      return new Response("مبصر شیپورک روشن است 🟢", { status: 200 });
    }

    let update;
    try {
      update = await request.json();
    } catch (e) {
      return new Response("Bad Request", { status: 400 });
    }

    // اجرای پردازش اصلی؛ از ctx.waitUntil استفاده می‌کنیم تا Worker منتظر تمام‌شدنش بمونه
    ctx.waitUntil(handleUpdate(env, update));

    // بلافاصله به تلگرام جواب می‌دیم که پیام دریافت شد (نباید معطل بمونه)
    return new Response("OK", { status: 200 });
  },

  // این تابع هر یک دقیقه توسط Cloudflare Cron Trigger اجرا می‌شه
  // و پیام‌های هشداری که زمانشون رسیده رو پاک می‌کنه
  async scheduled(event, env, ctx) {
    ctx.waitUntil(processPendingDeletions(env));
  },
};

async function processPendingDeletions(env) {
  const expired = await getExpiredDeletions(env);
  for (const item of expired) {
    try {
      await deleteMessage(env, item.chat_id, item.message_id);
    } catch (e) {
      // پیام شاید قبلاً دستی حذف شده باشه؛ مشکلی نیست
    }
    await removePendingDeletion(env, item.chat_id, item.message_id);
  }
}

async function handleUpdate(env, update) {
  const message = update.message;
  if (!message) return; // فقط پیام‌های عادی رو پردازش می‌کنیم (نه ادیت، ری‌اکشن و...)

  const chatId = message.chat.id;
  const userId = message.from.id;

  // پیام‌های خصوصی (غیرگروهی) رو فقط برای دستورات ساده پاسخ می‌دیم
  if (message.chat.type === "private") {
    await handleSlashCommand(env, message);
    return;
  }

  // ۱. بررسی دستورات ادمین (اسلش یا !)
  if (message.text?.startsWith("/")) {
    const handled = await handleSlashCommand(env, message);
    if (handled) return;
  }
  if (message.text?.startsWith("!")) {
    const handled = await handleTextCommand(env, message);
    if (handled) return;
  }

  // ۲. تشخیص ادمین: ادمین‌ها از قوانین معاف هستند
  const admin = await isAdmin(env, chatId, userId);
  if (admin) return;

  // ۳. تشخیص لیست سفید: کاربران معاف
  const whitelisted = await isWhitelisted(env, chatId, userId);
  if (whitelisted) return;

  // ۴. بررسی پیام با موتور قوانین
  const violation = await checkMessage(env, chatId, message);
  if (!violation) return; // تخلفی نبود، اجازه‌ی پیام

  // ۵. حذف پیام متخلف
  try {
    await deleteMessage(env, chatId, message.message_id);
  } catch (e) {
    // اگر ربات دسترسی حذف نداشت، فقط ادامه می‌دیم و هشدار می‌دیم
  }

  // ۶. افزودن هشدار به کاربر
  const warningCount = await addWarning(env, chatId, userId);
  const label = LOCK_LABELS[violation] || violation;
  const userName = message.from.first_name || "کاربر";

  const warningMsg = await sendMessage(
    env,
    chatId,
    `⚠️ ${userName} عزیز، ارسال «${label}» در این گروه مجاز نیست.\nتعداد هشدار: ${warningCount}/${WARNING_LIMIT}`
  );

  // ۷. حذف خودکار پیام هشدار بعد از چند ثانیه (طبق نقشه‌ی شما)
  // چون Workers از setTimeout واقعی پشتیبانی نمی‌کنه، پیام رو در دیتابیس ثبت می‌کنیم
  // و Cron Trigger (هر یک دقیقه) پیام‌های منقضی‌شده رو پاک می‌کنه.
  const warningMessageId = warningMsg?.result?.message_id;
  if (warningMessageId) {
    await schedulePendingDeletion(env, chatId, warningMessageId, WARNING_AUTO_DELETE_MS);
  }
}
