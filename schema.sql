-- گروه‌های ثبت‌شده
CREATE TABLE IF NOT EXISTS groups (
  chat_id INTEGER PRIMARY KEY,
  title TEXT,
  registered_at INTEGER
);

-- تنظیمات قفل هر گروه (هر ردیف = یک نوع قفل برای یک گروه)
CREATE TABLE IF NOT EXISTS locks (
  chat_id INTEGER,
  lock_type TEXT,          -- link, forward, photo, video, file, gif, sticker, emoji, phone, location, text, poll, forward_channel
  is_locked INTEGER DEFAULT 0,  -- 0 = آزاد, 1 = قفل
  PRIMARY KEY (chat_id, lock_type)
);

-- لیست سفید (کاربرانی که از قوانین معاف هستند)
CREATE TABLE IF NOT EXISTS whitelist (
  chat_id INTEGER,
  user_id INTEGER,
  PRIMARY KEY (chat_id, user_id)
);

-- هشدارهای کاربران
CREATE TABLE IF NOT EXISTS warnings (
  chat_id INTEGER,
  user_id INTEGER,
  count INTEGER DEFAULT 0,
  last_warning_at INTEGER,
  PRIMARY KEY (chat_id, user_id)
);

-- پیام‌های هشداری که باید بعد از چند ثانیه خودکار حذف بشن
CREATE TABLE IF NOT EXISTS pending_deletions (
  chat_id INTEGER,
  message_id INTEGER,
  delete_at INTEGER,     -- زمان (میلی‌ثانیه) که باید حذف بشه
  PRIMARY KEY (chat_id, message_id)
);
