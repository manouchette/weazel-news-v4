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

        const me = await fetch("/api/me").then(r => r.json());

        if (me.user) {
            account.textContent = me.user.name;
            account.href =
                me.user.role === "citoyen"
                    ? "/citizen.html"
                    : "/cms.html";
        }

        /* BREAKING NEWS */

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


        /* ARTICLES */

        const articleData =
            await fetch(
                "/api/articles?q=" +
                encodeURIComponent(q.value || "") +
                "&category=" +
                encodeURIComponent(cat.value || "")
            ).then(r => r.json());

        articles.innerHTML = articleData.map(x => `

            <article class="card ${x.breaking ? "isbreaking" : ""}">

                <div
                    class="pic"
                    ${x.image
                        ? `style="background-image:url('${esc(x.image)}')"`
                        : ""
                    }
                ></div>

                <div class="body">

                    <label>
                        ${x.breaking ? "🚨 BREAKING • " : ""}
                        ${esc(x.category)}
                    </label>

                    <h3>
                        ${esc(x.title)}
                    </h3>

                    <p>
                        ${esc(x.excerpt)}
                    </p>

                    <small>
                        ✍️ ${esc(x.author)}
                        •
                        👁️ ${x.views}
                    </small>

                    <a
                        class="read"
                        href="/article.html?id=${x.id}"
                    >
                        Lire →
                    </a>

                </div>

            </article>

        `).join("");


        /* EVENEMENTS */

        const eventData =
            await fetch("/api/events").then(r => r.json());

        eventsList.innerHTML =
            eventData.map(x => `

                <article>

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


        /* GALERIE */

        const galleryData =
            await fetch("/api/gallery").then(r => r.json());

        galleryList.innerHTML =
            galleryData.map(x => `

                <figure>

                    <img
                        src="${esc(x.image)}"
                        alt="${esc(x.title)}"
                    >

                    <figcaption>

                        <b>
                            ${esc(x.title)}
                        </b>

                        <br>

                        ${esc(x.caption || "")}

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


q.oninput = load;
cat.onchange = load;

load();