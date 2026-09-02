const Database = require("better-sqlite3");

const db = new Database("./data/weazel.db");

const jobs = [
    {
        id: 1,
        title: "Agent immobilier",
        company: "Dynasty 8",
        type: "Indépendant",
        description:
            "Accompagnez les habitants dans leurs projets immobiliers et développez votre activité au sein de Dynasty 8.",
        contact: "Dynasty 8",
        discord: ""
    },
    {
        id: 2,
        title: "Vendeur",
        company: "Pawnshop",
        type: "Indépendant",
        description:
            "Rejoignez l'équipe du Pawnshop et participez à la vie quotidienne du commerce.",
        contact: "Pawnshop",
        discord: ""
    },
    {
        id: 3,
        title: "Médecin / EMS",
        company: "Pillbox Hospital",
        type: "Service public",
        description:
            "Le service médical recrute. Rejoignez les équipes du Pillbox Hospital et contribuez à la prise en charge des habitants.",
        contact: "Pillbox Hospital",
        discord: ""
    },
    {
        id: 4,
        title: "Policier",
        company: "Station 13 — LSPD",
        type: "Service public",
        description:
            "La police recrute de nouveaux agents pour renforcer ses effectifs et assurer la sécurité de Los Santos.",
        contact: "Station 13 — LSPD",
        discord: ""
    }
];

const update = db.prepare(`
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
`);

try {

    const transaction = db.transaction(() => {

        for (const job of jobs) {

            update.run(
                job.title,
                job.company,
                job.type,
                job.description,
                job.contact,
                job.discord,
                job.id
            );

        }

    });

    transaction();

    console.log("");
    console.log("================================");
    console.log(" OFFRES D'EMPLOI CORRIGEES");
    console.log("================================");
    console.log("");

    const result = db.prepare(`
        SELECT
            id,
            title,
            company,
            type,
            description,
            contact,
            discord,
            active
        FROM jobs
        ORDER BY id
    `).all();

    console.table(result);

} catch (error) {

    console.error("");
    console.error("ERREUR :", error.message);

} finally {

    db.close();

}