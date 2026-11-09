import { entryQuery, findBranch, forkQuery, history, ideaQueries, query } from "./ideas.mjs";
import { telegramRequest } from "./telegram.mjs";

const encoder = new TextEncoder();
const json = (data, status = 200) => Response.json(data, { status, headers: { "Cache-Control": "no-store" } });
const invalid = () => json({ error: "اطلاعات وارد شده معتبر نیست." }, 400);
const missing = () => json({ error: "موردی پیدا نشد." }, 404);

async function identity(request, token) {
  const data = new URLSearchParams(request.headers.get("X-Telegram-Init-Data") ?? "");
  const hash = data.get("hash");
  const age = Date.now() / 1000 - Number(data.get("auth_date"));
  if (!token || !/^[a-f0-9]{64}$/.test(hash ?? "") || age < -60 || age > 3600 || !Number.isFinite(age)) return null;
  data.delete("hash");
  data.sort();
  const check = Array.from(data, ([key, value]) => `${key}=${value}`).join("\n");
  const algorithm = { name: "HMAC", hash: "SHA-256" };
  const seed = await crypto.subtle.importKey("raw", encoder.encode("WebAppData"), algorithm, false, ["sign"]);
  const secret = await crypto.subtle.sign("HMAC", seed, encoder.encode(token));
  const key = await crypto.subtle.importKey("raw", secret, algorithm, false, ["verify"]);
  const digest = Uint8Array.from(hash.match(/../g), (pair) => parseInt(pair, 16));
  if (!await crypto.subtle.verify("HMAC", key, digest, encoder.encode(check))) return null;
  try {
    const id = JSON.parse(data.get("user"))?.id;
    return Number.isSafeInteger(id) && id > 0 ? id : null;
  } catch {
    return null;
  }
}

function clean(value, max) {
  return typeof value === "string" && value.trim().length <= max ? value.trim() : "";
}

export async function api(request, env, url) {
  const owner = await identity(request, env.BOT_TOKEN);
  if (!owner) return json({ error: "دفتر ایده ها را دوباره از چت ربات باز کنید." }, 401);
  const db = env.DB;
  const [, , resource, id, action] = url.pathname.split("/");
  const method = request.method;

  if (resource === "ideas" && !id && method === "GET") {
    const term = (url.searchParams.get("q") ?? "").trim().slice(0, 120)
      .replace(/ي/gu, "ی").replace(/ك/gu, "ک").replace(/\u200c/gu, " ");
    const { results } = await query(db, `
      SELECT i.id, i.title, i.tags, i.medium,
        (SELECT substr(e.body, 1, 240) FROM branches b JOIN entries e ON e.branch_id = b.id
         WHERE b.idea_id = i.id AND b.parent_id IS NULL AND e.body <> '' ORDER BY e.id LIMIT 1) AS preview
      FROM ideas i WHERE i.owner = ? AND (
        ? = '' OR instr(lower(replace(replace(replace(
          i.title || ' ' || i.tags || ' ' || i.medium, 'ي', 'ی'), 'ك', 'ک'), char(8204), ' ')), lower(?)) > 0
        OR EXISTS (
          SELECT 1 FROM branches b JOIN entries e ON e.branch_id = b.id
          WHERE b.idea_id = i.id AND instr(lower(replace(replace(replace(
            e.body, 'ي', 'ی'), 'ك', 'ک'), char(8204), ' ')), lower(?)) > 0
        )
      )
      ORDER BY i.created_at DESC, i.rowid DESC
    `, owner, term, term, term).all();
    return json(results);
  }

  if (resource === "bot" && !id && method === "GET") {
    const response = await telegramRequest(env.BOT_TOKEN, "getMe", {});
    const data = await response.json();
    if (!data.ok) return json({ error: "ارتباط با تلگرام برقرار نشد." }, 502);
    return json({ username: data.result.username });
  }

  if (resource === "photo" && id && method === "GET") {
    const entry = await query(db, `
      SELECT e.photo_id FROM entries e JOIN branches b ON b.id = e.branch_id
      JOIN ideas i ON i.id = b.idea_id WHERE e.id = ? AND i.owner = ?
    `, id, owner).first();
    if (!entry?.photo_id) return missing();
    const file = await telegramRequest(env.BOT_TOKEN, "getFile", { file_id: entry.photo_id });
    const data = await file.json();
    if (!data.ok) return json({ error: "تصویر در دسترس نیست." }, 502);
    const image = await fetch(`https://api.telegram.org/file/bot${env.BOT_TOKEN}/${data.result.file_path}`);
    if (!image.ok) return json({ error: "تصویر در دسترس نیست." }, 502);
    return new Response(image.body, { headers: { "Content-Type": "image/jpeg", "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" } });
  }

  if (resource === "ideas" && id && id !== "merge") {
    const idea = await query(db, "SELECT * FROM ideas WHERE id = ? AND owner = ?", id, owner).first();
    if (!idea) return missing();
    if (method === "GET") {
      const { results: branches } = await query(db, "SELECT * FROM branches WHERE idea_id = ? ORDER BY rowid", id).all();
      const { results: sources } = await query(db, `
        SELECT i.id, i.title FROM idea_sources s JOIN ideas i ON i.id = s.source_id WHERE s.idea_id = ?
      `, id).all();
      return json({ ...idea, branches, sources });
    }
    if (method === "PATCH") {
      const body = await request.json().catch(() => null);
      const title = clean(body?.title, 120);
      if (!title) return invalid();
      await query(db, "UPDATE ideas SET title = ?, tags = ?, medium = ? WHERE id = ? AND owner = ?",
        title, clean(body.tags, 250), clean(body.medium, 80), id, owner).run();
      return json({ ok: true });
    }
  }

  if (resource === "branches" && id) {
    const branch = await findBranch(db, owner, id);
    if (!branch) return missing();
    if (method === "GET" && !action) return json(await history(db, id));
    if (method === "PATCH" && !action) {
      const body = await request.json().catch(() => null);
      const name = clean(body?.name, 80);
      if (!name) return invalid();
      await query(db, "UPDATE branches SET name = ? WHERE id = ?", name, id).run();
      return json({ ok: true });
    }
    if (method === "POST" && action === "fork") {
      const body = await request.json().catch(() => null);
      const anchor = (await history(db, id)).find((entry) => entry.id === body?.entryId);
      if (!anchor) return invalid();
      const branchId = crypto.randomUUID();
      await forkQuery(db, branchId, branch.idea_id, anchor, clean(body.name, 80) || "شاخه تازه").run();
      return json({ id: branchId }, 201);
    }
  }

  if (resource === "ideas" && id === "merge" && method === "POST") {
    const body = await request.json().catch(() => null);
    const title = clean(body?.title, 120);
    const sourceIds = body?.sources;
    const photos = body?.photos;
    if (!title || !Array.isArray(sourceIds) || sourceIds.length !== 2 ||
        sourceIds.some((source) => typeof source !== "string") || sourceIds[0] === sourceIds[1] ||
        !Array.isArray(photos) || photos.length > 30 || !photos.every(Number.isSafeInteger) ||
        typeof body.text !== "string" || body.text.length > 16000) return invalid();

    const { results: sources } = await query(db, "SELECT id FROM ideas WHERE owner = ? AND id IN (?, ?)", owner, ...sourceIds).all();
    if (sources.length !== 2) return missing();
    const photoIds = [];
    for (const photo of new Set(photos)) {
      const entry = await query(db, `
        SELECT e.photo_id FROM entries e JOIN branches b ON b.id = e.branch_id
        WHERE e.id = ? AND b.idea_id IN (?, ?)
      `, photo, ...sourceIds).first();
      if (!entry?.photo_id) return invalid();
      photoIds.push(entry.photo_id);
    }
    const text = body.text.trim();
    if (!text && !photoIds.length) return invalid();
    const ideaId = crypto.randomUUID();
    const branchId = crypto.randomUUID();
    const entries = photoIds.map((photoId) => entryQuery(db, branchId, "", photoId));
    if (text) entries.unshift(entryQuery(db, branchId, text));
    await db.batch([
      ...ideaQueries(db, owner, ideaId, branchId, title),
      ...sourceIds.map((source) => query(db, "INSERT INTO idea_sources VALUES (?, ?)", ideaId, source)),
      ...entries,
    ]);
    return json({ id: ideaId }, 201);
  }
  return missing();
}
