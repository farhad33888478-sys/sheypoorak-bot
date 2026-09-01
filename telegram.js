// توابع کمکی برای ارتباط با Telegram API

const API_BASE = "https://api.telegram.org/bot";

async function callTelegram(env, method, payload) {
  const url = `${API_BASE}${env.BOT_TOKEN}/${method}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return res.json();
}

export async function sendMessage(env, chatId, text, options = {}) {
  return callTelegram(env, "sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    ...options,
  });
}

export async function deleteMessage(env, chatId, messageId) {
  return callTelegram(env, "deleteMessage", {
    chat_id: chatId,
    message_id: messageId,
  });
}

export async function getChatMember(env, chatId, userId) {
  return callTelegram(env, "getChatMember", {
    chat_id: chatId,
    user_id: userId,
  });
}

export async function isAdmin(env, chatId, userId) {
  try {
    const res = await getChatMember(env, chatId, userId);
    const status = res?.result?.status;
    return status === "administrator" || status === "creator";
  } catch (e) {
    return false;
  }
}
