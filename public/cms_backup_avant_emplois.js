let me;

const $ = id => document.getElementById(id);

async function api(url, options = {}) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
        throw new Error(data.error || "Une erreur est survenue.");
    }

    return data;
}

/* =========================
   INITIALISATION
========================= */

async function init() {
    try {
        const result = await api("/api/me");

        if (!result.user || !["admin", "journaliste"].includes(result.user.role)) {
            location.href = "/login.html";
            return;
        }

        me = result.user;

        await loadStats();
        await loadAll();
        await loadJobs();

        if (me.role === "admin") {
            admin.classList.remove("hidden");
            await loadUsers();
        }
    } catch (error) {
        console.error("Initialisation :", error);
        alert("Impossible de charger le CMS : " + error.message);
    }
}

/* =========================
   STATISTIQUES
========================= */

async function loadStats() {
    const statsData = await api("/api/admin/stats");

    stats.innerHTML = Object.entries(statsData)
        .map(([key, value]) => `
            <div>
                <b>${value}</b>
                <small>${esc(key)}</small>
            </div>
        `)
        .join("");
}

/* =========================
   ARTICLES / CITOYENS /
   EVENEMENTS / GALERIE
========================= */

async function loadAll() {

    /* ARTICLES */

    const articlesData = await api("/api/articles");

    articles.innerHTML = articlesData.map(article => `
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

            ${me.role === "admin"
                ? `<button onclick="delA(${article.id})">Supprimer</button>`
                : ""
            }
        </div>
    `).join("");


    /* ANNONCES CITOYENNES */

    const citizensData = await api("/api/admin/citizen-posts");

    citizens.innerHTML = citizensData.map(post => `
        <div class="row">
            <div>
                <b>${esc(post.title)}</b>

                <small>
                    Par ${esc(post.user_name)}
                    • ${esc(post.status)}
                </small>

                <p>${esc(post.content)}</p>
            </div>

            ${
                post.status === "pending"
                ? `
                    <button onclick="review(${post.id}, 'approved')">
                        ✓ Valider
                    </button>

                    <button onclick="review(${post.id}, 'rejected')">
                        ✕ Refuser
                    </button>
                `
                : ""
            }
        </div>
    `).join("");


    /* EVENEMENTS */

    const eventsData = await api("/api/events");

    events.innerHTML = eventsData.map(event => `
        <div class="row">
            <div>
                <b>${esc(event.title)}</b>

                <small>
                    ${esc(event.date)}
                    • ${esc(event.location || "")}
                </small>
            </div>

            <button onclick="delEvent(${event.id})">
                Supprimer
            </button>
        </div>
    `).join("");


    /* GALERIE */

    const galleryData = await api("/api/gallery");

    photos.innerHTML = galleryData.map(photo => `
        <div class="row">
            <div>
                <b>${esc(photo.title)}</b>
                <small>${esc(photo.caption || "")}</small>
            </div>

            <button onclick="delPhoto(${photo.id})">
                Supprimer
            </button>
        </div>
    `).join("");
}

/* =========================
   ARTICLES
========================= */

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

        const title = $("atitle");
        const excerpt = $("aexcerpt");
        const category = $("acat");
        const content = $("acontent");
        const breakingInput = $("breaking");
        const imageInput = $("aimage");
        const articleId = $("aid");

        let imageUrl = null;

        if (imageInput && imageInput.files && imageInput.files.length > 0) {

            const formData = new FormData();

            formData.append(
                "image",
                imageInput.files[0],
                imageInput.files[0].name
            );

            const upload = await api("/api/upload", {
                method: "POST",
                body: formData
            });

            imageUrl = upload.url;
        }

        const body = {
            title: title.value.trim(),
            excerpt: excerpt.value.trim(),
            category: category.value,
            content: content.value.trim(),
            image: imageUrl,
            breaking: breakingInput.checked
        };

        if (!body.title || !body.content) {
            alert("Le titre et le contenu sont obligatoires.");
            return;
        }

        if (articleId.value) {

            await api("/api/articles/" + articleId.value, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });

        } else {

            await api("/api/articles", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(body)
            });
        }

        editor.classList.add("hidden");

        await loadAll();

        alert("Article publié avec succès.");

    } catch (error) {

        console.error("Publication :", error);

        alert(
            "Erreur lors de la publication : " +
            error.message
        );
    }
};


async function edit(id) {

    try {

        const article = await api("/api/articles/" + id);

        aid.value = article.id;
        atitle.value = article.title;
        aexcerpt.value = article.excerpt || "";
        acat.value = article.category;
        acontent.value = article.content;
        breaking.checked = !!article.breaking;

        editor.classList.remove("hidden");

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch (error) {

        alert("Impossible de modifier l'article : " + error.message);
    }
}


async function send(id) {

    try {

        const result = await api(
            "/api/articles/" + id + "/discord",
            {
                method: "POST"
            }
        );

        alert(
            result.discord.ok
                ? "Article envoyé sur Discord."
                : "Échec : " + result.discord.error
        );

    } catch (error) {

        alert("Erreur Discord : " + error.message);
    }
}


async function delA(id) {

    if (!confirm("Supprimer définitivement cet article ?")) {
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


/* =========================
   ANNONCES CITOYENNES
========================= */

async function review(id, status) {

    try {

        let note = "";

        if (status === "rejected") {
            note = prompt("Motif du refus ?") || "";
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

        alert("Erreur : " + error.message);
    }
}


/* =========================
   EMPLOIS
========================= */

async function loadJobs() {

    try {

        const jobData = await api("/api/admin/jobs");

        if (!jobs) {
            return;
        }

        if (!jobData.length) {

            jobs.innerHTML = `
                <div class="row">
                    <div>
                        <b>Aucune offre d'emploi</b>
                        <small>
                            Ajoutez une nouvelle offre ci-dessus.
                        </small>
                    </div>
                </div>
            `;

            return;
        }

        jobs.innerHTML = jobData.map(job => `

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
                        ${job.active
                            ? "🟢 Offre active"
                            : "🔴 Offre désactivée"
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
                            <div style="margin-top:8px;">
                                <a
                                    href="${safeUrl(job.discord)}"
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
                    ${job.active
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

        console.error("Emplois :", error);

        if (jobs) {
            jobs.innerHTML = `
                <div class="row">
                    <b>Erreur de chargement des offres</b>
                    <small>${esc(error.message)}</small>
                </div>
            `;
        }
    }
}


jobForm.onsubmit = async event => {

    event.preventDefault();

    try {

        const title = $("jt");
        const company = $("jc");
        const type = $("jtype");
        const contact = $("jcontact");
        const discord = $("jdiscord");
        const description = $("jdesc");
        const active = $("jactive");
        const imageInput = $("jimage");
        const jobId = $("jid");

        let imageUrl = null;

        /* IMAGE */

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

            const upload = await api("/api/upload", {
                method: "POST",
                body: formData
            });

            imageUrl = upload.url;
        }

        /* DISCORD */

        let discordUrl = discord.value.trim();

        if (
            discordUrl &&
            !discordUrl.startsWith("https://discord.gg/") &&
            !discordUrl.startsWith("https://discord.com/")
        ) {
            alert(
                "Le lien Discord doit commencer par https://discord.gg/ ou https://discord.com/"
            );
            return;
        }

        const body = {

            title: title.value.trim(),

            company: company.value.trim(),

            type: type.value,

            description: description.value.trim(),

            contact: contact.value.trim(),

            discord: discordUrl,

            image: imageUrl,

            active: active.checked

        };

        if (
            !body.title ||
            !body.company ||
            !body.description
        ) {

            alert(
                "Le poste, l'entreprise et la description sont obligatoires."
            );

            return;
        }


        /* MODIFICATION */

        if (jobId.value) {

            await api(
                "/api/admin/jobs/" + jobId.value,
                {
                    method: "PUT",

                    headers: {
                        "Content-Type": "application/json"
                    },

                    body: JSON.stringify(body)
                }
            );

            alert("Offre modifiée avec succès.");

        }

        /* NOUVELLE OFFRE */

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

            alert("Offre d'emploi publiée.");
        }

        jobForm.reset();

        jid.value = "";

        jactive.checked = true;

        await loadJobs();

    } catch (error) {

        console.error("Emploi :", error);

        alert(
            "Erreur lors de l'enregistrement : " +
            error.message
        );
    }
};


/* =========================
   MODIFIER EMPLOI
========================= */

async function editJob(id) {

    try {

        const jobData = await api("/api/admin/jobs");

        const job = jobData.find(
            item => Number(item.id) === Number(id)
        );

        if (!job) {
            alert("Offre introuvable.");
            return;
        }

        jid.value = job.id;

        jt.value = job.title || "";

        jc.value = job.company || "";

        jtype.value = job.type || "CDI";

        jcontact.value = job.contact || "";

        jdiscord.value = job.discord || "";

        jdesc.value = job.description || "";

        jactive.checked = !!job.active;

        jimage.value = "";

        window.scrollTo({
            top: document.getElementById("jobForm").offsetTop - 100,
            behavior: "smooth"
        });

    } catch (error) {

        alert(
            "Impossible de modifier l'offre : " +
            error.message
        );
    }
}


/* =========================
   ACTIVER / DESACTIVER
========================= */

async function toggleJob(id) {

    try {

        const jobData = await api("/api/admin/jobs");

        const job = jobData.find(
            item => Number(item.id) === Number(id)
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

                    title: job.title,

                    company: job.company,

                    type: job.type,

                    description: job.description,

                    contact: job.contact || "",

                    discord: job.discord || "",

                    image: job.image || null,

                    active: !job.active
                })
            }
        );

        await loadJobs();

    } catch (error) {

        alert(
            "Impossible de modifier le statut : " +
            error.message
        );
    }
}


/* =========================
   SUPPRIMER EMPLOI
========================= */

async function delJob(id) {

    if (!confirm(
        "Supprimer définitivement cette offre d'emploi ?"
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


/* =========================
   ANNULER MODIFICATION EMPLOI
========================= */

if (window.jcancel) {

    jcancel.onclick = () => {

        jobForm.reset();

        jid.value = "";

        jactive.checked = true;
    };
}


/* =========================
   EVENEMENTS
========================= */

eventForm.onsubmit = async event => {

    event.preventDefault();

    try {

        await api(
            "/api/admin/events",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    title: et.value,

                    date: ed.value,

                    time: etm.value,

                    location: el.value,

                    description: edesc.value

                })
            }
        );

        event.target.reset();

        await loadAll();

    } catch (error) {

        alert(
            "Erreur événement : " +
            error.message
        );
    }
};


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

        alert(
            "Erreur : " +
            error.message
        );
    }
}


/* =========================
   GALERIE
========================= */

galleryForm.onsubmit = async event => {

    event.preventDefault();

    try {

        if (!gi.files.length) {

            alert("Sélectionnez une image.");

            return;
        }

        const formData = new FormData();

        formData.append(
            "image",
            gi.files[0],
            gi.files[0].name
        );

        const upload = await api(
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

                    title: gt.value,

                    image: upload.url,

                    caption: gc.value

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

    if (!confirm("Supprimer cette photo ?")) {
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


/* =========================
   UTILISATEURS
========================= */

async function loadUsers() {

    const usersData = await api("/api/users");

    users.innerHTML = usersData.map(user => `

        <div class="row">

            <div>

                <b>${esc(user.name)}</b>

                <small>
                    ${esc(user.email)}
                    •
                    ${esc(user.role)}
                </small>

            </div>

            <button onclick="delU(${user.id})">
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

                    name: un.value,

                    email: ue.value,

                    password: up.value,

                    role: ur.value

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

    if (!confirm("Supprimer cet utilisateur ?")) {
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


/* =========================
   DECONNEXION
========================= */

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


/* =========================
   SECURITE HTML
========================= */

function esc(value) {

    return String(value ?? "")
        .replace(
            /[&<>"']/g,
            character => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#039;"
            }[character])
        );
}


function safeUrl(url) {

    const value = String(url || "").trim();

    if (
        value.startsWith("https://discord.gg/") ||
        value.startsWith("https://discord.com/")
    ) {
        return esc(value);
    }

    return "#";
}


/* =========================
   DEMARRAGE
========================= */

init();async function loadJobs(){
let j=await api("/api/admin/jobs");
jobs.innerHTML=j.map(x=>`<div class="row"><div><b>${esc(x.title)}</b><small>${esc(x.company)} • ${esc(x.type)} • ${x.active?"🟢 Active":"🔴 Désactivée"}</small><p>${esc(x.description)}</p><small>${esc(x.contact||"")}</small></div><button onclick="editJob(${x.id})">Modifier</button><button onclick="toggleJob(${x.id},${x.active?0:1})">${x.active?"Désactiver":"Activer"}</button><button onclick="delJob(${x.id})">Supprimer</button></div>`).join("")
}

jobForm.onsubmit=async e=>{
e.preventDefault();
try{
let imageUrl=null;
if(jimage.files.length){
let f=new FormData();
f.append("image",jimage.files[0]);
imageUrl=(await api("/api/upload",{method:"POST",body:f})).url
}
let body={
title:jt.value,
company:jc.value,
type:jtype.value,
description:jdesc.value,
contact:jcontact.value,
image:imageUrl,
active:jactive.checked
};
if(jid.value){
await api("/api/admin/jobs/"+jid.value,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
}else{
await api("/api/admin/jobs",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)})
}
e.target.reset();
jid.value="";
jactive.checked=true;
await loadJobs()
}catch(err){
console.error("Emploi:",err);
alert("Erreur : "+err.message)
}
};

async function editJob(id){
let j=(await api("/api/admin/jobs")).find(x=>x.id===id);
if(!j)return;
jid.value=j.id;
jt.value=j.title;
jc.value=j.company;
jtype.value=j.type;
jdesc.value=j.description;
jcontact.value=j.contact||"";
jactive.checked=!!j.active;
}

async function toggleJob(id,active){
await api("/api/admin/jobs/"+id,{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:(await api("/api/admin/jobs")).find(x=>x.id===id).title,company:(await api("/api/admin/jobs")).find(x=>x.id===id).company,type:(await api("/api/admin/jobs")).find(x=>x.id===id).type,description:(await api("/api/admin/jobs")).find(x=>x.id===id).description,contact:(await api("/api/admin/jobs")).find(x=>x.id===id).contact,image:(await api("/api/admin/jobs")).find(x=>x.id===id).image,active:!!active})});
loadJobs()
}

async function delJob(id){
if(confirm("Supprimer cette offre ?")){
await api("/api/admin/jobs/"+id,{method:"DELETE"});
loadJobs()
}
}
async function delEvent(id){if(confirm("Supprimer ?")){await api("/api/admin/events/"+id,{method:"DELETE"});loadAll()}}async function delPhoto(id){if(confirm("Supprimer ?")){await api("/api/admin/gallery/"+id,{method:"DELETE"});loadAll()}}userForm.onsubmit=async e=>{e.preventDefault();await api("/api/users",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:un.value,email:ue.value,password:up.value,role:ur.value})});e.target.reset();init()};async function delU(id){if(confirm("Supprimer ?")){await api("/api/users/"+id,{method:"DELETE"});init()}}logout.onclick=async()=>{await api("/api/logout",{method:"POST"});location="/"};function esc(s){return String(s??"").replace(/[&<>"']/g,m=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[m]))}init();