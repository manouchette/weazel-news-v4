const fs = require("fs");

const file = "./server.js";
const backup = "./server_backup_emplois.js";

console.log("======================================");
console.log(" REPARATION WEAZEL NEWS - EMPLOIS");
console.log("======================================");

if (!fs.existsSync(backup)) {
    console.error("ERREUR : server_backup_emplois.js introuvable.");
    process.exit(1);
}

let source = fs.readFileSync(backup, "utf8");

/*
    On récupère la partie située entre :
    app.get("/api/jobs"
    et
    app.get("/api/events"
*/

const start = source.indexOf('app.get("/api/jobs"');
const end = source.indexOf('app.get("/api/events"');

if (start === -1) {
    console.error("ERREUR : route /api/jobs introuvable.");
    process.exit(1);
}

if (end === -1) {
    console.error("ERREUR : route /api/events introuvable.");
    process.exit(1);
}


/*
    Routes Emploi propres
*/

const jobsRoutes = `app.get("/api/jobs",(req,res)=>{
    try {
        const jobs = db.prepare(\`
            SELECT *
            FROM jobs
            WHERE active=1
            ORDER BY datetime(created_at) DESC
        \`).all();

        res.json(jobs);

    } catch(error) {

        console.error("GET /api/jobs :", error);

        res.status(500).json({
            error: "Impossible de charger les offres."
        });
    }
});


app.get("/api/admin/jobs",staff,(req,res)=>{
    try {

        const jobs = db.prepare(\`
            SELECT *
            FROM jobs
            ORDER BY active DESC, datetime(created_at) DESC
        \`).all();

        res.json(jobs);

    } catch(error) {

        console.error("GET /api/admin/jobs :", error);

        res.status(500).json({
            error: "Impossible de charger les offres."
        });
    }
});


app.post("/api/admin/jobs",staff,(req,res)=>{

    try {

        const {
            title,
            company,
            type,
            description,
            contact,
            image,
            discord,
            active
        } = req.body;


        if (!title || !company || !type || !description) {

            return res.status(400).json({
                error: "Poste, entreprise, type et description requis."
            });
        }


        const result = db.prepare(\`
            INSERT INTO jobs
            (
                title,
                company,
                type,
                description,
                contact,
                image,
                discord,
                active
            )
            VALUES (?,?,?,?,?,?,?,?)
        \`).run(
            title.trim(),
            company.trim(),
            type.trim(),
            description.trim(),
            contact ? contact.trim() : "",
            image || null,
            discord ? discord.trim() : "",
            active === false ? 0 : 1
        );


        res.json({
            ok: true,
            id: result.lastInsertRowid
        });

    } catch(error) {

        console.error("POST /api/admin/jobs :", error);

        res.status(500).json({
            error: error.message
        });
    }
});


app.put("/api/admin/jobs/:id",staff,(req,res)=>{

    try {

        const {
            title,
            company,
            type,
            description,
            contact,
            image,
            discord,
            active
        } = req.body;


        if (!title || !company || !type || !description) {

            return res.status(400).json({
                error: "Poste, entreprise, type et description requis."
            });
        }


        const result = db.prepare(\`
            UPDATE jobs
            SET
                title=?,
                company=?,
                type=?,
                description=?,
                contact=?,
                image=?,
                discord=?,
                active=?
            WHERE id=?
        \`).run(
            title.trim(),
            company.trim(),
            type.trim(),
            description.trim(),
            contact ? contact.trim() : "",
            image || null,
            discord ? discord.trim() : "",
            active ? 1 : 0,
            req.params.id
        );


        res.json({
            ok: result.changes > 0
        });

    } catch(error) {

        console.error("PUT /api/admin/jobs :", error);

        res.status(500).json({
            error: error.message
        });
    }
});


app.delete("/api/admin/jobs/:id",staff,(req,res)=>{

    try {

        const result = db.prepare(
            "DELETE FROM jobs WHERE id=?"
        ).run(req.params.id);


        res.json({
            ok: result.changes > 0
        });

    } catch(error) {

        console.error("DELETE /api/admin/jobs :", error);

        res.status(500).json({
            error: error.message
        });
    }
});


`;


/*
    Remplacement propre
*/

source =
    source.substring(0, start) +
    jobsRoutes +
    source.substring(end);


/*
    Sauvegarde de la version actuelle cassée
*/

if (fs.existsSync(file)) {

    fs.copyFileSync(
        file,
        "./server_avant_reparation_complete.js"
    );

}


/*
    Écriture
*/

fs.writeFileSync(
    file,
    source,
    "utf8"
);


console.log("");
console.log("======================================");
console.log(" ROUTES EMPLOI RECONSTRUITES");
console.log("======================================");
console.log("");
console.log("POST  /api/admin/jobs");
console.log("PUT   /api/admin/jobs/:id");
console.log("DELETE /api/admin/jobs/:id");
console.log("GET   /api/jobs");
console.log("GET   /api/admin/jobs");
console.log("");
console.log("Discord : OK");
console.log("Images  : OK");
console.log("");
console.log("Correction terminee.");