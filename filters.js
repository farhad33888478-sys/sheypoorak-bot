// موتور قوانین: بررسی می‌کنه که آیا پیام تخلفی داره یا نه

import { isLocked } from "./db.js";

// تشخیص لینک در متن پیام
function containsLink(text) {
  if (!text) return false;
  const linkPattern = /(https?:\/\/|www\.|t\.me\/|telegram\.me\/)/i;
  return linkPattern.test(text);
}

// تشخیص شماره تلفن در متن پیام
function containsPhone(text) {
  if (!text) return false;
  const phonePattern = /(\+?\d[\d\s\-]{7,}\d)/;
  return phonePattern.test(text);
}

// نگاشت نوع پیام تلگرام به نوع قفل مربوطه
function detectMessageTypes(message) {
  const types = [];

  if (message.forward_from || message.forward_from_chat) {
    types.push("forward");
    if (message.forward_from_chat && message.forward_from_chat.type === "channel") {
      types.push("forward_channel");
    }
  }
  if (message.photo) types.push("photo");
  if (message.video || message.video_note) types.push("video");
  if (message.document) types.push("file");
  if (message.animation) types.push("gif");
  if (message.sticker) types.push("sticker");
  if (message.contact) types.push("phone");
  if (message.location || message.venue) types.push("location");
  if (message.poll) types.push("poll");

  if (message.text) {
    types.push("text");
    if (containsLink(message.text)) types.push("link");
    if (containsPhone(message.text)) types.push("phone");
  }
  if (message.caption) {
    if (containsLink(message.caption)) types.push("link");
  }

  return types;
}

/**
 * بررسی پیام و برگرداندن اولین نوع تخلف پیدا شده (یا null اگر تخلفی نبود)
 */
export async function checkMessage(env, chatId, message) {
  const detectedTypes = detectMessageTypes(message);

  for (const type of detectedTypes) {
    const locked = await isLocked(env, chatId, type);
    if (locked) {
      return type; // اولین تخلف پیدا شده رو برمی‌گردونیم
    }
  }

  return null; // تخلفی نیست
}

// لیبل فارسی برای نمایش نوع تخلف در پیام هشدار
export const LOCK_LABELS = {
  link: "لینک",
  forward: "فوروارد",
  forward_channel: "فوروارد کانال",
  photo: "عکس",
  video: "فیلم",
  file: "فایل",
  gif: "GIF",
  sticker: "استیکر",
  emoji: "ایموجی",
  phone: "شماره تلفن",
  location: "لوکیشن",
  text: "متن",
  poll: "نظرسنجی",
};
