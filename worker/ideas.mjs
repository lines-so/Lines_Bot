export function query(db, sql, ...values) {
  return db.prepare(sql).bind(...values);
}

export function findBranch(db, owner, id) {
  return query(db, `
    SELECT b.*, i.title FROM branches b JOIN ideas i ON i.id = b.idea_id
    WHERE b.id = ? AND i.owner = ?
  `, id, owner).first();
}

export async function history(db, branchId) {
  const { results } = await query(db, `
    WITH RECURSIVE lineage(id, cutoff) AS (
      SELECT ?, NULL
      UNION ALL
      SELECT b.parent_id, b.fork_entry_id
      FROM lineage l JOIN branches b ON b.id = l.id WHERE b.parent_id IS NOT NULL
    )
    SELECT e.id, e.branch_id, e.body, e.photo_id IS NOT NULL AS has_photo
    FROM lineage l JOIN entries e ON e.branch_id = l.id
    WHERE l.cutoff IS NULL OR e.id <= l.cutoff
    ORDER BY e.id
  `, branchId).all();
  return results;
}

export function stateQuery(db, owner, mode, branchId = null) {
  return query(db, `
    INSERT INTO chat_state (owner, mode, branch_id) VALUES (?, ?, ?)
    ON CONFLICT(owner) DO UPDATE SET mode = excluded.mode, branch_id = excluded.branch_id
  `, owner, mode, branchId);
}

export function ideaQueries(db, owner, ideaId, branchId, title) {
  return [
    query(db, "INSERT INTO ideas (id, owner, title) VALUES (?, ?, ?)", ideaId, owner, title),
    query(db, "INSERT INTO branches (id, idea_id, name) VALUES (?, ?, 'شاخه اصلی')", branchId, ideaId),
  ];
}

export function entryQuery(db, branchId, body, photoId = null, messageId = null) {
  return query(db, `
    INSERT INTO entries (branch_id, body, photo_id, telegram_message_id) VALUES (?, ?, ?, ?)
  `, branchId, body, photoId, messageId);
}

export function forkQuery(db, id, ideaId, entry, name) {
  return query(db, `
    INSERT INTO branches (id, idea_id, name, parent_id, fork_entry_id) VALUES (?, ?, ?, ?, ?)
  `, id, ideaId, name, entry.branch_id, entry.id);
}
