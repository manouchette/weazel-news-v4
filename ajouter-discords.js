const Database = require("better-sqlite3");

const db = new Database("./data/weazel.db");

db.prepare(`
    UPDATE jobs
    SET discord = ?
    WHERE company = ?
`).run(
    "https://discord.gg/g7VkpCnkv",
    "Station 13 — LSPD"
);

db.prepare(`
    UPDATE jobs
    SET discord = ?
    WHERE company = ?
`).run(
    "https://discord.gg/GM8Rf2YNJ",
    "Pawnshop"
);

console.log("Discords ajoutés :");

console.table(
    db.prepare(`
        SELECT id, title, company, discord
        FROM jobs
        ORDER BY id
    `).all()
);

db.close();