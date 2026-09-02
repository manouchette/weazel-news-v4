const esc = s => String(s ?? "").replace(
    /[&<>"']/g,
    m => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    }[m])
);

function safeUrl(url) {
    const value = String(url || "").trim();

    if (
        value.startsWith("https://discord.gg/") ||
        value.startsWith("https://discord.com/")
    ) {
        return value;
    }

    return "#";
}

async function load() {

    try {

        /* =========================
           COMPTE
        ========================= */

        const me = await fetch("/api/me").then(r => r.json());

        if (me.user) {
            account.textContent = me.user.name;

            account.href =
                me.user.role === "citoyen"
                    ? "/citizen.html"
                    : "/cms.html";
        }


        /* =========================
           BREAKING NEWS
        ========================= */

        const breakingData =
            await fetch("/api/breaking").then(r => r.json());

        breaking.innerHTML =
            breakingData.length
                ? breakingData.map(x => `
                    <a href="/article.html?id=${x.id}">
                        🚨 ${esc(x.title)}
                    </a>
                `).join("")
                : "";


        /* =========================
           NEWSROOM
           DERNIÈRES ACTUALITÉS
        ========================= */

        const articleData =
            await fetch(
                "/api/articles?q=" +
                encodeURIComponent(q.value || "") +
                "&category=" +
                encodeURIComponent(cat.value || "")
            ).then(r => r.json());


        if (!articleData.length) {

            articles.innerHTML = `
                <div class="empty-newsroom">
                    <h3>📰 Aucune actualité</h3>
                    <p>
                        Aucune actualité ne correspond à votre recherche.
                    </p>
                </div>
            `;

        } else {

            articles.innerHTML = `

                <div class="newsroom-header">

                    <div>
                        <span class="newsroom-kicker">
                            WEAZEL NEWS
                        </span>

                        <h2>
                            Dernières actualités
                        </h2>

                        <p>
                            Retrouvez les dernières informations
                            de San Andreas.
                        </p>
                    </div>

                    <span class="newsroom-count">
                        ${articleData.length} article${articleData.length > 1 ? "s" : ""}
                    </span>

                </div>

                <div class="newsroom-grid">

                    ${articleData.map(x => `

                        <article class="card newsroom-card ${x.breaking ? "isbreaking" : ""}">

                            <a
                                class="newsroom-image"
                                href="/article.html?id=${x.id}"
                                ${
                                    x.image
                                        ? `style="background-image:url('${esc(x.image)}')"`
                                        : ""
                                }
                            >
                                ${
                                    x.breaking
                                        ? `<span class="breaking-badge">🚨 BREAKING NEWS</span>`
                                        : ""
                                }
                            </a>


                            <div class="body">

                                <label>
                                    ${esc(x.category || "Actualités")}
                                </label>

                                <h3>
                                    ${esc(x.title)}
                                </h3>

                                <p>
                                    ${esc(
                                        x.excerpt ||
                                        "Découvrez cette actualité dans son intégralité."
                                    )}
                                </p>

                                <div class="newsroom-meta">

                                    <span>
                                        ✍️ ${esc(x.author || "Weazel News")}
                                    </span>

                                    <span>
                                        👁️ ${x.views || 0}
                                    </span>

                                </div>

                                <a
                                    class="read"
                                    href="/article.html?id=${x.id}"
                                >
                                    Lire l'article →
                                </a>

                            </div>

                        </article>

                    `).join("")}

                </div>

            `;
        }


        /* =========================
           EVENEMENTS
        ========================= */

        const eventData =
            await fetch("/api/events").then(r => r.json());

        eventsList.innerHTML =
            eventData.map(x => `

                <article class="event-card">

                    ${
                        x.image
                            ? `
                                <div class="event-image">
                                    <img
                                        src="${esc(x.image)}"
                                        alt="${esc(x.title)}"
                                    >
                                </div>
                            `
                            : ""
                    }

                    <b>
                        ${new Date(
                            x.date + "T00:00"
                        ).toLocaleDateString("fr-FR")}
                    </b>

                    <h3>
                        ${esc(x.title)}
                    </h3>

                    <small>
                        🕒 ${esc(x.time || "")}
                        •
                        📍 ${esc(x.location || "")}
                    </small>

                    <p>
                        ${esc(x.description)}
                    </p>

                </article>

            `).join("")
            || "<p>Aucun événement à venir.</p>";


        /* =========================
           EMPLOIS
        ========================= */

        const jobData =
            await fetch("/api/jobs").then(r => r.json());

        if (!jobData.length) {

            jobsList.innerHTML = `
                <p>
                    Aucune offre d'emploi actuellement.
                </p>
            `;

        } else {

            jobsList.innerHTML = jobData.map(job => `

                <article class="job-card">

                    ${
                        job.image
                            ? `
                                <div class="job-image">
                                    <img
                                        src="${esc(job.image)}"
                                        alt="${esc(job.title)}"
                                    >
                                </div>
                            `
                            : ""
                    }

                    <label>
                        ${esc(job.type)}
                    </label>

                    <h3>
                        ${esc(job.title)}
                    </h3>

                    <b>
                        ${esc(job.company)}
                    </b>

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
                                <a
                                    class="btn red"
                                    href="${safeUrl(job.discord)}"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                >
                                    💬 Rejoindre le Discord
                                </a>
                            `
                            : ""
                    }

                </article>

            `).join("");
        }


        /* =========================
           GALERIE
        ========================= */

        const galleryData =
            await fetch("/api/gallery").then(r => r.json());

galleryList.innerHTML =
    galleryData.map(x => `

        <figure>

            ${
                x.youtube
                    ? `
                        <div class="gallery-video">
                            <iframe
                                src="${youtubeEmbed(x.youtube)}"
                                title="${esc(x.title)}"
                                frameborder="0"
                                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                allowfullscreen
                            ></iframe>
                        </div>
                    `
                    : x.image
                        ? `
                            <img
                                src="${esc(x.image)}"
                                alt="${esc(x.title)}"
                            >
                        `
                        : ""
            }

            <figcaption>

                <b>
                    ${esc(x.title)}
                </b>

                ${
                    x.caption
                        ? `
                            <br>
                            ${esc(x.caption)}
                        `
                        : ""
                }

                ${
                    x.youtube
                        ? `
                            <br>
                            <a
                                href="${esc(x.youtube)}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="read"
                            >
                                ▶ Voir sur YouTube
                            </a>
                        `
                        : ""
                }

            </figcaption>

        </figure>

    `).join("");


    } catch (error) {

        console.error(
            "Erreur chargement du site :",
            error
        );

    }
}

function youtubeEmbed(url) {

    try {

        const value = String(url || "").trim();

        if (value.includes("youtu.be/")) {
            const id = value.split("youtu.be/")[1].split(/[?&]/)[0];
            return "https://www.youtube.com/embed/" + id;
        }

        const parsed = new URL(value);
        const id = parsed.searchParams.get("v");

        if (id) {
            return "https://www.youtube.com/embed/" + id;
        }

        if (parsed.pathname.includes("/shorts/")) {
            const id = parsed.pathname.split("/shorts/")[1].split(/[?&]/)[0];
            return "https://www.youtube.com/embed/" + id;
        }

    } catch (e) {
        console.error("Lien YouTube invalide :", e);
    }

    return "";
}
q.oninput = load;
cat.onchange = load;

load();