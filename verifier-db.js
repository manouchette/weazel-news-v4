const Database = require("better-sqlite3");

const db = new Database("./data/weazel.db");

console.log("=== COLONNES DE LA TABLE JOBS ===");

const columns = db.prepare("PRAGMA table_info(jobs)").all();

console.table(columns);

const discord = columns.find(c => c.name === "discord");

if (discord) {
    console.log("✅ La colonne DISCORD existe.");
} else {
    console.log("❌ La colonne DISCORD n'existe PAS.");
}

db.close();