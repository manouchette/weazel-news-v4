const Database = require("better-sqlite3");

const db = new Database("./data/weazel.db");

const articles = db.prepare(`
    SELECT id, title, category, author_id, created_at
    FROM articles
    ORDER BY id DESC
`).all();

console.table(articles);

db.close();