import { api } from "./api.mjs";
import { telegramReply, telegramRequest } from "./telegram.mjs";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    try {
      if (url.pathname.startsWith("/api/")) return await api(request, env, url);
      if (url.pathname !== "/telegram/webhook") return new Response(null, { status: 404 });
      if (request.method !== "POST") return new Response(null, { status: 405, headers: { Allow: "POST" } });
      if (!env.TELEGRAM_WEBHOOK_SECRET || !env.BOT_TOKEN) return new Response(null, { status: 503 });
      if (request.headers.get("X-Telegram-Bot-Api-Secret-Token") !== env.TELEGRAM_WEBHOOK_SECRET) {
        return new Response(null, { status: 403 });
      }

      const update = await request.json().catch(() => null);
      if (!Number.isSafeInteger(update?.update_id)) return new Response(null, { status: 400 });
      const callback = update.callback_query;
      const message = update.message ?? callback?.message;
      const sender = update.message?.from ?? callback?.from;
      if (message?.chat?.type !== "private" || !Number.isSafeInteger(sender?.id)) return new Response(null, { status: 204 });
      if (callback && !["new", "ai", "question"].includes(callback.data)) return new Response(null, { status: 204 });

      const input = callback ? { ...message, from: sender, text: `/${callback.data}` } : message;
      const reply = await telegramReply(env, input, url.origin);
      if (callback) await telegramRequest(env.BOT_TOKEN, "answerCallbackQuery", { callback_query_id: callback.id });
      const response = await telegramRequest(env.BOT_TOKEN, "sendMessage", { chat_id: message.chat.id, ...reply });
      if (!response.ok || !(await response.json()).ok) return new Response(null, { status: 502 });
      return new Response(null, { status: 204 });
    } catch {
      console.error("Idehban request failed", url.pathname);
      return new Response(null, { status: 500 });
    }
  },
};
