CREATE TABLE ideas (
    id TEXT PRIMARY KEY,
    owner INTEGER NOT NULL,
    title TEXT NOT NULL,
    tags TEXT NOT NULL DEFAULT '',
    medium TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX ideas_owner ON ideas(owner, created_at);

CREATE TABLE branches (
    id TEXT PRIMARY KEY,
    idea_id TEXT NOT NULL REFERENCES ideas(id),
    name TEXT NOT NULL,
    parent_id TEXT REFERENCES branches(id),
    fork_entry_id INTEGER REFERENCES entries(id)
);
CREATE INDEX branches_idea ON branches(idea_id);

CREATE TABLE entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    branch_id TEXT NOT NULL REFERENCES branches(id),
    body TEXT NOT NULL DEFAULT '',
    photo_id TEXT,
    telegram_message_id INTEGER,
    CHECK (body <> '' OR photo_id IS NOT NULL)
);
CREATE INDEX entries_branch ON entries(branch_id, id);
CREATE INDEX entries_telegram ON entries(telegram_message_id);

CREATE TABLE idea_sources (
    idea_id TEXT NOT NULL REFERENCES ideas(id),
    source_id TEXT NOT NULL REFERENCES ideas(id),
    PRIMARY KEY (idea_id, source_id)
);

CREATE TABLE chat_state (
    owner INTEGER PRIMARY KEY,
    mode TEXT NOT NULL CHECK (mode IN ('new', 'idea', 'ai')),
    branch_id TEXT REFERENCES branches(id)
);

CREATE TABLE telegram_actions (
    owner INTEGER NOT NULL,
    message_id INTEGER NOT NULL,
    reply TEXT NOT NULL,
    PRIMARY KEY (owner, message_id)
);
