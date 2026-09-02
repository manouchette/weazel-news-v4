const Database = require("better-sqlite3");

const db = new Database("./data/weazel.db");

try {
    db.prepare(`
        UPDATE jobs
        SET
            title = ?,
            company = ?,
            type = ?,
            description = ?,
            contact = ?,
            discord = ?,
            active = 1
        WHERE id = ?
    `).run(
        "Agent immobilier",
        "Dynasty 8",
        "Indépendant",
        "Accompagnez les habitants dans leurs projets immobiliers et développez votre activité au sein de Dynasty 8.",
        "Dynasty 8",
        "",
        1
    );

    db.prepare(`
        UPDATE jobs
        SET
            title = ?,
            company = ?,
            type = ?,
            description = ?,
            contact = ?,
            discord = ?,
            active = 1
        WHERE id = ?
    `).run(
        "Vendeur",
        "Pawnshop",
        "Indépendant",
        "Rejoignez l'équipe du Pawnshop et participez à la vie quotidienne du commerce.",
        "Pawnshop",
        "",
        2
    );

    db.prepare(`
        UPDATE jobs
        SET
            title = ?,
            company = ?,
            type = ?,
            description = ?,
            contact = ?,
            discord = ?,
            active = 1
        WHERE id = ?
    `).run(
        "Médecin / EMS",
        "Pillbox Hospital",
        "Service public",
        "Le service médical recrute. Rejoignez les équipes du Pillbox Hospital et contribuez à la prise en charge des habitants.",
        "Pillbox Hospital",
        "",
        3
    );

    db.prepare(`
        UPDATE jobs
        SET
            title = ?,
            company = ?,
            type = ?,
            description = ?,
            contact = ?,
            discord = ?,
            active = 1
        WHERE id = ?
    `).run(
        "Policier",
        "Station 13 — LSPD",
        "Service public",
        "La police recrute de nouveaux agents pour renforcer ses effectifs et assurer la sécurité de Los Santos.",
        "Station 13 — LSPD",
        "",
        4
    );

    console.log("=================================");
    console.log("OFFRES D'EMPLOI CORRIGEES");
    console.log("=================================");

    const jobs = db.prepare(`
        SELECT id,title,company,type,description,contact,discord,active
        FROM jobs
        ORDER BY id
    `).all();

    console.table(jobs);

} catch (error) {
    console.error("ERREUR :", error);
} finally {
    db.close();
}