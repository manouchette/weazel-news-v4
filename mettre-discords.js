const Database = require("better-sqlite3");

const db = new Database("./data/weazel.db");

const updates = [
    {
        company: "Station 13 — LSPD",
        discord: "https://discord.gg/g7VkpCnkv"
    },
    {
        company: "Pawnshop",
        discord: "https://discord.gg/GM8Rf2YNJ"
    },
    {
        company: "Dynasty 8",
        discord: "https://discord.gg/TvNdgZMC6"
    }
];

const update = db.prepare(`
    UPDATE jobs
    SET discord = ?
    WHERE company = ?
`);

for (const job of updates) {
    const result = update.run(job.discord, job.company);
    console.log(
        `${job.company} : ${result.changes > 0 ? "OK" : "introuvable"}`
    );
}

console.log("");
console.log("=== DISCORDS DES EMPLOIS ===");

console.table(
    db.prepare(`
        SELECT id, title, company, discord
        FROM jobs
        ORDER BY id
    `).all()
);

db.close();