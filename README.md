# ایده بان

نسخه فعلی ربات فارسی ایده بان برای ثبت نام در لیست انتظار است. کاربر در چت خصوصی با `/start` شروع می کند و در یک خط می نویسد برای چه کاری می خواهد از ربات استفاده کند. هر شناسه تلگرام فقط یک بار ثبت می شود.

## راه اندازی

```sh
pip install -r requirements.txt
export BOT_TOKEN="<your bot token>"
python -m bot.main
```

دیتابیس پیش فرض `db.sqlite3` است. برای استقرار، `WAITLIST_DB_PATH` را به یک فایل روی فضای ذخیره سازی پایدار تنظیم کنید. مسیر پوشه باید از قبل وجود داشته باشد.

## بررسی ثبت نام ها

برای شمارش ثبت نام های تکمیل شده و مشاهده پاسخ ها، دستورهای زیر را روی سرور اجرا کنید. اگر مسیر دیتابیس را تغییر داده اید، همان مسیر را جایگزین کنید.

```sh
sqlite3 db.sqlite3 'SELECT COUNT(*) FROM waitlist WHERE registered_at IS NOT NULL;'
sqlite3 -header -csv db.sqlite3 'SELECT telegram_user_id, reason, registered_at FROM waitlist WHERE registered_at IS NOT NULL ORDER BY registered_at DESC;'
```

زمان ثبت به وقت UTC است. شناسه تلگرام برای اطلاع رسانی بعدی ذخیره می شود و ارسال اعلان در این نسخه پیاده سازی نشده است.
