let me = null;

const $ = id => document.getElementById(id);

async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue.");
    }

    return data;
}

function esc(value) {
    return String(value ?? "").replace(
        /[&<>"']/g,
        char => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[char])
    );
}

function discordUrl(url) {
    const value = String(url || "").trim();

    if (
        value.startsWith("https://discord.gg/") ||
        value.startsWith("https://discord.com/")
    ) {
        return value;
    }

    return "";
}


/* =========================================================
   INITIALISATION
========================================================= */

async function init() {

    try {

        const session = await api("/api/me");

        if (
            !session.user ||
            !["admin", "journaliste"].includes(session.user.role)
        ) {
            location.href = "/login.html";
            return;
        }

        me = session.user;

        await loadStats();
        await loadAll();
        await loadJobs();

        if (me.role === "admin") {
            const adminPanel = document.getElementById("admin");

if (adminPanel) {
    adminPanel.classList.remove("hidden");
}
            await loadUsers();
        }

    } catch (error) {

        console.error("Initialisation :", error);

        alert(
            "Impossible de charger le CMS : " +
            error.message
        );
    }
}


/* =========================================================
   STATISTIQUES
========================================================= */

async function loadStats() {

    const data = await api("/api/admin/stats");

    stats.innerHTML = Object.entries(data)
        .map(([key, value]) => `
            <div>
                <b>${value}</b>
                <small>${esc(key)}</small>
            </div>
        `)
        .join("");
}


/* =========================================================
   CHARGEMENT GENERAL
========================================================= */

async function loadAll() {

    /* ARTICLES */

    const articleData = await api("/api/articles");

    articles.innerHTML = articleData.map(article => `

        <div class="row">

            <div>

                <b>${esc(article.title)}</b>

                <small>
                    ${esc(article.category)}
                    • ${article.views} vues
                    ${article.breaking ? " • 🚨 BREAKING" : ""}
                </small>

            </div>

            <button onclick="edit(${article.id})">
                Modifier
            </button>

            <button onclick="send(${article.id})">
                Discord
            </button>

            ${
                me.role === "admin"
                    ? `
                        <button onclick="delA(${article.id})">
                            Supprimer
                        </button>
                    `
                    : ""
            }

        </div>

    `).join("");


/* ================================
   DEMANDES CITOYENNES
================================ */

try {

    const citizenData =
        await api("/api/admin/citizen-posts");


    if (!citizenData.length) {

        citizens.innerHTML = `
            <div class="row">
                <div>
                    <b>Aucune demande citoyenne</b>
                    <small>
                        Les nouvelles demandes envoyées par les citoyens apparaîtront ici.
                    </small>
                </div>
            </div>
        `;

    } else {

        citizens.innerHTML = citizenData.map(post => {

            let statusText = "En attente";

            if (post.status === "approved") {
                statusText = "Acceptée";
            }

            if (post.status === "rejected") {
                statusText = "Refusée";
            }


            return `
                <div class="row">

                    <div>

                        <b>${esc(post.title)}</b>

                        <small>
                            👤 ${esc(post.user_name || "Citoyen")}
                            • 📌 ${esc(post.category || "Citoyen")}
                        </small>

                        <small>
                            📧 ${esc(post.email || "Aucun email")}
                        </small>

                        <p>
                            ${esc(post.content)}
                        </p>

                        <span class="status ${esc(post.status)}">
                            ${statusText}
                        </span>

                        ${
                            post.review_note
                                ? `
                                    <small>
                                        📝 ${esc(post.review_note)}
                                    </small>
                                `
                                : ""
                        }

                    </div>


                    ${
                        post.status === "pending"
                            ? `
                                <button
                                    class="btn"
                                    onclick="review(${post.id}, 'approved')"
                                >
                                    V Valider
                                </button>

                                <button
                                    class="btn dark"
                                    onclick="review(${post.id}, 'rejected')"
                                >
                                    X Refuser
                                </button>
                            `
                            : ""
                    }

                </div>
            `;

        }).join("");

    }

} catch (error) {

    console.error(
        "Demandes citoyennes :",
        error
    );

    citizens.innerHTML = `
        <div class="row">
            <div>
                <b>Impossible de charger les demandes</b>
                <small>
                    ${esc(error.message)}
                </small>
            </div>
        </div>
    `;

}
    const eventData =
        await api("/api/events");

    events.innerHTML = eventData.map(event => `

        <div class="row">

            <div>

                <b>${esc(event.title)}</b>

                <small>
                    ${esc(event.date)}
                    •
                    ${esc(event.location || "")}
                </small>

            </div>

            <button onclick="delEvent(${event.id})">
                Supprimer
            </button>

        </div>

    `).join("");


    /* GALERIE */

    const galleryData =
        await api("/api/gallery");

    photos.innerHTML = galleryData.map(photo => `

        <div class="row">

            <div>

                <b>${esc(photo.title)}</b>

                <small>
                    ${esc(photo.caption || "")}
                </small>

            </div>

            <button onclick="delPhoto(${photo.id})">
                Supprimer
            </button>

        </div>

    `).join("");
}


/* =========================================================
   ARTICLES
========================================================= */

newArticle.onclick = () => {

    editor.classList.remove("hidden");

    editor.reset();

    aid.value = "";
};


cancel.onclick = () => {

    editor.classList.add("hidden");

};


editor.onsubmit = async event => {

    event.preventDefault();

    try {

        const imageInput = $("aimage");

        let imageUrl = null;

        if (
            imageInput &&
            imageInput.files &&
            imageInput.files.length > 0
        ) {

            const formData = new FormData();

            formData.append(
                "image",
                imageInput.files[0],
                imageInput.files[0].name
            );

            const upload =
                await api("/api/upload", {
                    method: "POST",
                    body: formData
                });

            imageUrl = upload.url;
        }

        const body = {

            title: $("atitle").value.trim(),

            excerpt: $("aexcerpt").value.trim(),

            category: $("acat").value,

            content: $("acontent").value.trim(),

            image: imageUrl,

            breaking: $("breaking").checked

        };


        if (!body.title || !body.content) {

            alert(
                "Le titre et le contenu sont obligatoires."
            );

            return;
        }


        if ($("aid").value) {

            await api(
                "/api/articles/" + $("aid").value,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(body)
                }
            );

        } else {

            await api(
                "/api/articles",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(body)
                }
            );
        }


        editor.classList.add("hidden");

        await loadAll();

        alert("Article enregistré avec succès.");

    } catch (error) {

        console.error("Article :", error);

        alert(
            "Erreur lors de la publication : " +
            error.message
        );
    }
};


async function edit(id) {

    try {

        const article =
            await api("/api/articles/" + id);

        aid.value = article.id;

        atitle.value = article.title || "";

        aexcerpt.value = article.excerpt || "";

        acat.value = article.category || "Actualités";

        acontent.value = article.content || "";

        breaking.checked = !!article.breaking;

        editor.classList.remove("hidden");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {

        alert(
            "Impossible de modifier l'article : " +
            error.message
        );
    }
}


async function send(id) {

    try {

        const result =
            await api(
                "/api/articles/" + id + "/discord",
                {
                    method: "POST"
                }
            );

        alert(
            result.discord.ok
                ? "Article envoyé sur Discord."
                : "Échec Discord : " +
                  result.discord.error
        );

    } catch (error) {

        alert(
            "Erreur Discord : " +
            error.message
        );
    }
}


async function delA(id) {

    if (!confirm(
        "Supprimer définitivement cet article ?"
    )) {
        return;
    }

    try {

        await api(
            "/api/articles/" + id,
            {
                method: "DELETE"
            }
        );

        await loadAll();

    } catch (error) {

        alert("Erreur : " + error.message);
    }
}


/* =========================================================
   ANNONCES CITOYENNES
========================================================= */

async function review(id, status) {

    try {

        let note = "";

        if (status === "rejected") {
            note = prompt(
                "Motif du refus ?"
            ) || "";
        }

        await api(
            "/api/admin/citizen-posts/" + id + "/review",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    status,
                    note
                })
            }
        );

        await loadAll();

    } catch (error) {

        alert(
            "Erreur : " +
            error.message
        );
    }
}


/* =========================================================
   EMPLOIS
========================================================= */

async function loadJobs() {

    try {

        const data =
            await api("/api/admin/jobs");

        if (!jobs) {
            return;
        }

        if (!data.length) {

            jobs.innerHTML = `
                <div class="row">

                    <div>

                        <b>
                            Aucune offre d'emploi
                        </b>

                        <small>
                            Créez une nouvelle offre
                            ci-dessus.
                        </small>

                    </div>

                </div>
            `;

            return;
        }


        jobs.innerHTML = data.map(job => `

            <div class="row">

                <div>

                    <b>
                        ${esc(job.title)}
                    </b>

                    <small>
                        ${esc(job.company)}
                        •
                        ${esc(job.type)}
                        •
                        ${
                            job.active
                                ? "🟢 Active"
                                : "🔴 Désactivée"
                        }
                    </small>

                    <p>
                        ${esc(job.description)}
                    </p>


                    ${
                        job.contact
                            ? `
                                <small>
                                    📞 ${esc(job.contact)}
                                </small>
                            `
                            : ""
                    }


                    ${
                        job.discord
                            ? `
                                <div style="margin-top:8px">

                                    <a
                                        href="${esc(discordUrl(job.discord))}"
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        class="btn"
                                    >
                                        💬 Discord de l'entreprise
                                    </a>

                                </div>
                            `
                            : ""
                    }

                </div>


                <button onclick="editJob(${job.id})">
                    ✏️ Modifier
                </button>


                <button onclick="toggleJob(${job.id})">
                    ${
                        job.active
                            ? "🔴 Désactiver"
                            : "🟢 Activer"
                    }
                </button>


                <button onclick="delJob(${job.id})">
                    🗑️ Supprimer
                </button>

            </div>

        `).join("");

    } catch (error) {

        console.error(
            "Chargement emplois :",
            error
        );

        jobs.innerHTML = `
            <div class="row">

                <div>

                    <b>
                        Erreur de chargement
                    </b>

                    <small>
                        ${esc(error.message)}
                    </small>

                </div>

            </div>
        `;
    }
}


/* =========================================================
   CREER / MODIFIER EMPLOI
========================================================= */

jobForm.onsubmit = async event => {

    event.preventDefault();

    try {

        const title =
            $("jt").value.trim();

        const company =
            $("jc").value.trim();

        const type =
            $("jtype").value;

        const contact =
            $("jcontact").value.trim();

        const discord =
            $("jdiscord").value.trim();

        const description =
            $("jdesc").value.trim();

        const active =
            $("jactive").checked;

        const imageInput =
            $("jimage");


        if (!title || !company || !description) {

            alert(
                "Le poste, l'entreprise et la description sont obligatoires."
            );

            return;
        }


        /* VALIDATION DISCORD */

        let discordLink = "";

        if (discord) {

            discordLink = discordUrl(discord);

            if (!discordLink) {

                alert(
                    "Le lien Discord doit commencer par https://discord.gg/ ou https://discord.com/"
                );

                return;
            }
        }


        /* IMAGE */

        let imageUrl = null;

        if (
            imageInput &&
            imageInput.files &&
            imageInput.files.length > 0
        ) {

            const formData =
                new FormData();

            formData.append(
                "image",
                imageInput.files[0],
                imageInput.files[0].name
            );

            const upload =
                await api(
                    "/api/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );

            imageUrl = upload.url;
        }


        const body = {

            title,

            company,

            type,

            description,

            contact,

            discord: discordLink,

            image: imageUrl,

            active

        };


        /* MODIFICATION */

        if ($("jid").value) {

            await api(
                "/api/admin/jobs/" +
                $("jid").value,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(body)
                }
            );

            alert(
                "Offre modifiée avec succès."
            );

        }

        /* CREATION */

        else {

            await api(
                "/api/admin/jobs",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(body)
                }
            );

            alert(
                "Offre publiée avec succès."
            );
        }


        jobForm.reset();

        $("jid").value = "";

        $("jactive").checked = true;

        await loadJobs();

    } catch (error) {

        console.error(
            "Enregistrement emploi :",
            error
        );

        alert(
            "Erreur emploi : " +
            error.message
        );
    }
};


/* =========================================================
   MODIFIER EMPLOI
========================================================= */

async function editJob(id) {

    try {

        const data =
            await api("/api/admin/jobs");

        const job =
            data.find(
                item =>
                    Number(item.id) === Number(id)
            );

        if (!job) {

            alert(
                "Offre introuvable."
            );

            return;
        }


        $("jid").value =
            job.id;

        $("jt").value =
            job.title || "";

        $("jc").value =
            job.company || "";

        $("jtype").value =
            job.type || "CDI";

        $("jcontact").value =
            job.contact || "";

        $("jdiscord").value =
            job.discord || "";

        $("jdesc").value =
            job.description || "";

        $("jactive").checked =
            !!job.active;

        $("jimage").value = "";


        document
            .getElementById("jobForm")
            .scrollIntoView({
                behavior: "smooth",
                block: "center"
            });

    } catch (error) {

        alert(
            "Impossible de modifier l'offre : " +
            error.message
        );
    }
}


/* =========================================================
   ACTIVER / DESACTIVER
========================================================= */

async function toggleJob(id) {

    try {

        const data =
            await api("/api/admin/jobs");

        const job =
            data.find(
                item =>
                    Number(item.id) === Number(id)
            );

        if (!job) {
            return;
        }


        await api(
            "/api/admin/jobs/" + id,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    title:
                        job.title,

                    company:
                        job.company,

                    type:
                        job.type,

                    description:
                        job.description,

                    contact:
                        job.contact || "",

                    discord:
                        job.discord || "",

                    image:
                        job.image || null,

                    active:
                        !job.active
                })
            }
        );

        await loadJobs();

    } catch (error) {

        alert(
            "Impossible de changer le statut : " +
            error.message
        );
    }
}


/* =========================================================
   SUPPRIMER EMPLOI
========================================================= */

async function delJob(id) {

    if (!confirm(
        "Supprimer définitivement cette offre ?"
    )) {
        return;
    }

    try {

        await api(
            "/api/admin/jobs/" + id,
            {
                method: "DELETE"
            }
        );

        await loadJobs();

    } catch (error) {

        alert(
            "Impossible de supprimer l'offre : " +
            error.message
        );
    }
}


/* =========================================================
   ANNULER EMPLOI
========================================================= */

if ($("jcancel")) {

    $("jcancel").onclick = () => {

        jobForm.reset();

        $("jid").value = "";

        $("jactive").checked = true;
    };
}


/* =========================================================
   EVENEMENTS
========================================================= */

if (typeof eventForm !== "undefined" && eventForm) {

    eventForm.onsubmit = async event => {

        event.preventDefault();

        try {

            let imageUrl = null;

            const imageInput = $("eimage");

            if (
                imageInput &&
                imageInput.files &&
                imageInput.files.length > 0
            ) {

                const formData = new FormData();

                formData.append(
                    "image",
                    imageInput.files[0]
                );

                const upload = await api(
                    "/api/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );

                imageUrl = upload.url;
            }

            await api(
                "/api/admin/events",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        title: $("et").value.trim(),
                        description: $("edesc").value.trim(),
                        date: $("ed").value,
                        time: $("etm").value.trim(),
                        location: $("el").value.trim(),
                        image: imageUrl
                    })
                }
            );
/* =========================================================
   EVENEMENTS
========================================================= */

if (typeof eventForm !== "undefined" && eventForm) {

    eventForm.onsubmit = async event => {

        event.preventDefault();

        try {

            let imageUrl = null;

            const imageInput = $("eimage");

            if (
                imageInput &&
                imageInput.files &&
                imageInput.files.length > 0
            ) {

                const formData = new FormData();

                formData.append(
                    "image",
                    imageInput.files[0]
                );

                const upload = await api(
                    "/api/upload",
                    {
                        method: "POST",
                        body: formData
                    }
                );

                imageUrl = upload.url;
            }

            await api(
                "/api/admin/events",
                {
                    method: "POST",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify({
                        title: $("et").value.trim(),
                        description: $("edesc").value.trim(),
                        date: $("ed").value,
                        time: $("etm").value.trim(),
                        location: $("el").value.trim(),
                        image: imageUrl
                    })
                }
            );

            event.target.reset();

            await loadAll();

            alert("Événement ajouté avec succès !");

        } catch (error) {

            console.error(
                "Erreur événement :",
                error
            );

            alert(
                "Erreur événement : " +
                error.message
            );
        }
    };
}


/* =========================================================
   SUPPRIMER EVENEMENT
========================================================= */

async function delEvent(id) {

    if (!confirm("Supprimer cet événement ?")) {
        return;
    }

    try {

        await api(
            "/api/admin/events/" + id,
            {
                method: "DELETE"
            }
        );

        await loadAll();

    } catch (error) {

        console.error(
            "Erreur suppression événement :",
            error
        );

        alert(
            "Erreur : " +
            error.message
        );
    }
}
/* =========================================================
   GALERIE
========================================================= */

galleryForm.onsubmit = async event => {

    event.preventDefault();

    try {

        if (
            !gi.files ||
            !gi.files.length
        ) {

            alert(
                "Sélectionnez une image."
            );

            return;
        }


        const formData =
            new FormData();

        formData.append(
            "image",
            gi.files[0],
            gi.files[0].name
        );


        const upload =
            await api(
                "/api/upload",
                {
                    method: "POST",
                    body: formData
                }
            );


        await api(
            "/api/admin/gallery",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    title:
                        $("gt").value,

                    image:
                        upload.url,

                    caption:
                        $("gc").value

                })
            }
        );


        event.target.reset();

        await loadAll();

    } catch (error) {

        alert(
            "Erreur galerie : " +
            error.message
        );
    }
};


async function delPhoto(id) {

    if (!confirm(
        "Supprimer cette photo ?"
    )) {
        return;
    }

    try {

        await api(
            "/api/admin/gallery/" + id,
            {
                method: "DELETE"
            }
        );

        await loadAll();

    } catch (error) {

        alert(
            "Erreur : " +
            error.message
        );
    }
}


/* =========================================================
   UTILISATEURS
========================================================= */

async function loadUsers() {

    const data =
        await api("/api/users");

    users.innerHTML =
        data.map(user => `

            <div class="row">

                <div>

                    <b>
                        ${esc(user.name)}
                    </b>

                    <small>
                        ${esc(user.email)}
                        •
                        ${esc(user.role)}
                    </small>

                </div>

                <button
                    onclick="delU(${user.id})"
                >
                    Supprimer
                </button>

            </div>

        `).join("");
}


userForm.onsubmit = async event => {

    event.preventDefault();

    try {

        await api(
            "/api/users",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    name:
                        $("un").value,

                    email:
                        $("ue").value,

                    password:
                        $("up").value,

                    role:
                        $("ur").value

                })
            }
        );

        event.target.reset();

        await loadUsers();

    } catch (error) {

        alert(
            "Erreur utilisateur : " +
            error.message
        );
    }
};


async function delU(id) {

    if (!confirm(
        "Supprimer cet utilisateur ?"
    )) {
        return;
    }

    try {

        await api(
            "/api/users/" + id,
            {
                method: "DELETE"
            }
        );

        await loadUsers();

    } catch (error) {

        alert(
            "Erreur : " +
            error.message
        );
    }
}


/* =========================================================
   DECONNEXION
========================================================= */

logout.onclick = async () => {

    try {

        await api(
            "/api/logout",
            {
                method: "POST"
            }
        );

        location.href = "/";

    } catch (error) {

        alert(
            "Erreur de déconnexion : " +
            error.message
        );
    }
};


/* =========================================================
   DEMARRAGE
========================================================= */

init();