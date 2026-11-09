import { entryQuery, findBranch, forkQuery, ideaQueries, query, stateQuery } from "./ideas.mjs";

const waitlistPrompt = "برای عضویت در لیست انتظار هوش مصنوعی، در یک خط بنویسید می خواهید از آن برای چه کاری استفاده کنید.";
const questions = [
  "اگر مهم ترین بخش این ایده را حذف کنی، چه چیزی هنوز جذاب می ماند؟",
  "چه چیزی را می توانی به این ایده اضافه کنی که انتظارش را نداریم؟",
  "کوچک ترین راه برای امتحان کردن این ایده چیست؟",
  "اگر این ایده را وارونه کنی، چه چیزی عوض می شود؟",
  "چه بخشی از ایده هنوز برای خودت سوال است؟",
];

export function telegramRequest(token, method, body) {
  return fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

export async function telegramReply(env, message, origin) {
  const db = env.DB;
  const owner = message.from.id;
  const photo = message.photo?.at(-1)?.file_id ?? null;
  const text = (message.text ?? (photo ? message.caption : "") ?? "").trim();
  const [command, argument] = (message.text ?? "").trim().split(/\s+/u);
  const state = await query(db, "SELECT * FROM chat_state WHERE owner = ?", owner).first();
  const options = { inline_keyboard: [
    [{ text: "دفتر ایده ها", web_app: { url: origin } }],
    [{ text: "ایده جدید", callback_data: "new" }, { text: "سوال کمکی", callback_data: "question" }],
    [{ text: "هوش مصنوعی", callback_data: "ai" }],
  ] };

  const confirmation = "شما به لیست انتظار هوش مصنوعی اضافه شدید. وقتی دسترسی باز شود، به شما اطلاع می دهیم.";
  const processed = await query(db, "SELECT reply FROM telegram_actions WHERE owner = ? AND message_id = ?", owner, message.message_id).first();
  if (processed) return { text: processed.reply, reply_markup: options };
  const remember = (reply) => query(db, "INSERT INTO telegram_actions (owner, message_id, reply) VALUES (?, ?, ?)", owner, message.message_id, reply);

  if (command === "/new" || (command === "/start" && argument === "new")) {
    await stateQuery(db, owner, "new").run();
    return { text: "متن یا تصویر ایده تازه را بفرستید.", reply_markup: options };
  }
  if (command === "/start") {
    if (argument?.startsWith("b_")) {
      const branch = await findBranch(db, owner, argument.slice(2));
      if (!branch) return { text: "شاخه پیدا نشد.", reply_markup: options };
      await stateQuery(db, owner, "idea", branch.id).run();
      return { text: `ادامه در «${branch.title}» / ${branch.name}. متن یا تصویر بفرستید.` };
    }
    const branch = state?.branch_id ? await findBranch(db, owner, state.branch_id) : null;
    if (state?.mode === "ai") {
      await stateQuery(db, owner, branch ? "idea" : "new", branch?.id).run();
    }
    const destination = branch
      ? `پیام بعدی در «${branch.title}» / ${branch.name} ثبت می شود. برای ثبت جداگانه «ایده جدید» را بزنید.`
      : "برای ثبت اولین جرقه، متن یا تصویر بفرستید.";
    return {
      text: `به ایده بان خوش آمدید.\n${destination}\nبرای شاخه زدن روی یک پیام ثبت شده ریپلای کنید و /branch را بفرستید.`,
      reply_markup: options,
    };
  }
  if (command === "/ai") {
    await query(db, "INSERT INTO waitlist (telegram_user_id) VALUES (?) ON CONFLICT DO NOTHING", owner).run();
    const entry = await query(db, "SELECT registered_at FROM waitlist WHERE telegram_user_id = ?", owner).first();
    if (entry.registered_at) return { text: "شما قبلا در لیست انتظار هوش مصنوعی ثبت شده اید." };
    await stateQuery(db, owner, "ai", state?.branch_id ?? null).run();
    return { text: waitlistPrompt };
  }
  if (command === "/cancel") {
    if (state?.mode === "ai" && state.branch_id) {
      await stateQuery(db, owner, "idea", state.branch_id).run();
      return { text: "ثبت نام لغو شد. پیام بعدی در شاخه قبلی ثبت می شود.", reply_markup: options };
    }
    await query(db, "DELETE FROM chat_state WHERE owner = ?", owner).run();
    return { text: "انتخاب فعلی لغو شد.", reply_markup: options };
  }
  if (command === "/question") {
    return { text: questions[Math.floor(Math.random() * questions.length)] };
  }
  if (command === "/branch") {
    const anchor = await query(db, `
      SELECT e.id, e.branch_id, b.idea_id FROM entries e
      JOIN branches b ON b.id = e.branch_id JOIN ideas i ON i.id = b.idea_id
      WHERE e.telegram_message_id = ? AND i.owner = ?
    `, message.reply_to_message?.message_id ?? null, owner).first();
    if (!anchor) return { text: "روی پیام ثبت شده ای که می خواهید از آن شاخه بزنید ریپلای کنید و /branch را بفرستید." };
    const branchId = crypto.randomUUID();
    await db.batch([
      forkQuery(db, branchId, anchor.idea_id, anchor, "شاخه تازه"),
      stateQuery(db, owner, "idea", branchId),
      remember("شاخه تازه فعال شد. پیام بعدی در همین شاخه ثبت می شود."),
    ]);
    return { text: "شاخه تازه فعال شد. پیام بعدی در همین شاخه ثبت می شود." };
  }
  if (command?.startsWith("/")) return { text: "برای دیدن گزینه ها /start را بزنید.", reply_markup: options };
  if (state?.mode === "ai") {
    if (!message.text || /[\r\n\u0085\u2028\u2029]/u.test(text) || !text) return { text: waitlistPrompt };
    await db.batch([
      query(db, `UPDATE waitlist SET reason = ?, registered_at = CURRENT_TIMESTAMP, registration_update_id = ?
        WHERE telegram_user_id = ? AND registered_at IS NULL`, text, message.message_id, owner),
      remember(confirmation),
      state.branch_id ? stateQuery(db, owner, "idea", state.branch_id) : query(db, "DELETE FROM chat_state WHERE owner = ?", owner),
    ]);
    return { text: confirmation, reply_markup: options };
  }
  if (!text && !photo) return { text: "برای ثبت ایده، متن یا تصویر بفرستید." };
  const ideaId = crypto.randomUUID();
  const branchId = state?.mode === "idea" ? state.branch_id : crypto.randomUUID();
  const title = [...text].slice(0, 55).join("") || "ایده تصویری";
  const branch = state?.mode === "idea" ? await findBranch(db, owner, branchId) : { title, name: "شاخه اصلی" };
  const reply = `در «${branch.title}» / ${branch.name} ثبت شد. برای ایده جدا /new را بزنید.`;
  await db.batch([
    ...(state?.mode === "idea" ? [] : ideaQueries(db, owner, ideaId, branchId, title)),
    entryQuery(db, branchId, text, photo, message.message_id),
    stateQuery(db, owner, "idea", branchId),
    remember(reply),
  ]);
  return { text: reply, reply_markup: options };
}
