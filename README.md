# ایده بان

ایده بان یک دفتر ایده فارسی برای تلگرام است. ثبت و دسته بندی، شاخه زدن، سوال های آماده و ترکیب دستی برای همه باز است. گزینه «هوش مصنوعی» فقط نام نویسی در لیست انتظار را باز می کند.

## استفاده

- `/start` دکمه دفتر ایده ها، ایده جدید، سوال کمکی و لیست انتظار هوش مصنوعی را نشان می دهد.
- متن و عکس در چت به شاخه فعال اضافه می شوند. برای جدا کردن یک ایده تازه، `/new` را بزنید.
- برای انشعاب از یک پیام ثبت شده، روی همان پیام ریپلای کنید و `/branch` را بفرستید. از داخل دفتر ایده ها هم می توانید از هر جرقه شاخه بزنید.
- مینی اپ امکان دیدن و نام گذاری شاخه ها، جستجو، ویرایش عنوان و دسته بندی و ترکیب دو ایده را دارد.
- `/ai` ثبت نام اختیاری هوش مصنوعی را شروع می کند. `/cancel` انتخاب فعال را پاک می کند.

## استقرار سرورلس روی Cloudflare Workers

در این حالت Worker پیام های تلگرام را از مسیر `/telegram/webhook` می گیرد و ثبت نام ها را در D1 ذخیره می کند. polling پایتون را برای همین توکن متوقف کنید. اگر قبلا ثبت نامی در SQLite ذخیره شده، پیش از تغییر وب هوک آن را به جدول D1 منتقل کنید در صورتی که می خواهید آن ثبت نام ها را برای قابلیت هوش مصنوعی معتبر بدانید. ستون `registration_update_id` برای ردیف های قدیمی می تواند خالی بماند.

با Node.js و حساب Cloudflare، وارد حساب خود شوید. دیتابیس D1 از قبل در `wrangler.jsonc` تنظیم شده است.

```sh
npx wrangler@4 login
```

سپس دستورات زیر را اجرا کنید. موقع ثبت Secret، مقدار توکن ربات و یک رشته تصادفی مستقل را وارد کنید. می توانید رشته تصادفی را با `openssl rand -hex 32` بسازید.

```sh
npx wrangler@4 d1 migrations apply idehban --remote
npx wrangler@4 deploy
npx wrangler@4 secret put BOT_TOKEN
npx wrangler@4 secret put TELEGRAM_WEBHOOK_SECRET
```

برای ثبت وب هوک، `WORKER_URL` را روی آدرس HTTPS خروجی deploy تنظیم کنید. همان دو مقدار Secret را در محیط محلی در متغیرهای `BOT_TOKEN` و `TELEGRAM_WEBHOOK_SECRET` قرار دهید. این مقادیر را در مخزن ذخیره نکنید.

```sh
node --input-type=module <<'JS'
const { BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET, WORKER_URL } = process.env;
if (!BOT_TOKEN || !TELEGRAM_WEBHOOK_SECRET || !WORKER_URL) {
  throw new Error("Set BOT_TOKEN, TELEGRAM_WEBHOOK_SECRET and WORKER_URL first.");
}
const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: new URL("/telegram/webhook", WORKER_URL).href,
    secret_token: TELEGRAM_WEBHOOK_SECRET,
    allowed_updates: ["message", "callback_query"],
    max_connections: 1,
  }),
});
const result = await response.json();
if (!response.ok || !result.ok) throw new Error("Telegram rejected the webhook.");
console.log("Webhook configured.");
JS
```

برای شمارش ثبت نام های تکمیل شده هوش مصنوعی و مشاهده پاسخ ها در نسخه سرورلس، این دستورها را اجرا کنید.

```sh
npx wrangler@4 d1 execute idehban --remote --command 'SELECT COUNT(*) AS registrations FROM waitlist WHERE registered_at IS NOT NULL;'
npx wrangler@4 d1 execute idehban --remote --command 'SELECT telegram_user_id, reason, registered_at FROM waitlist WHERE registered_at IS NOT NULL ORDER BY registered_at DESC;'
```
