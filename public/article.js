const id = new URLSearchParams(location.search).get("id");

const reactionList = [
    ["like", "👍"],
    ["heart", "❤️"],
    ["laugh", "😂"],
    ["wow", "😮"],
    ["angry", "😡"]
];

async function load() {
    const a = await fetch("/api/articles/" + id).then(r => r.json());

    if (a.error) {
        article.innerHTML = "<h1>Article introuvable</h1>";
        return;
    }

    const reactionCounts = {};

    (a.reactions || []).forEach(r => {
        reactionCounts[r.reaction] = r.count;
    });

    let latest = [];

    try {
        const data = await fetch("/api/articles").then(r => r.json());
        latest = Array.isArray(data)
            ? data.filter(x => Number(x.id) !== Number(id)).slice(0, 5)
            : [];
    } catch (e) {
        latest = [];
    }

    article.innerHTML = `
        <div class="article-page">

            <div class="article-layout">

                <main class="article-main">

                    <a class="article-back" href="/">
                        ← Retour
                    </a>

                    <div class="articlehead">

                        <label>
                            ${a.breaking ? "🚨 BREAKING NEWS" : esc(a.category)}
                        </label>

                        <h1>${esc(a.title)}</h1>

                        <p class="meta">
                            👤 Par ${esc(a.author)}
                            <span>•</span>
                            👁️ ${a.views}
                        </p>

                        ${
                            a.image
                            ? `
                            <div class="article-image-wrap">
                                <img
                                    class="article-main-image"
                                    src="${esc(a.image)}"
                                    alt="${esc(a.title)}"
                                >
                            </div>
                            `
                            : ""
                        }

                    </div>

                    <div class="content">
                        ${esc(a.content).replace(/\n/g, "<br>")}
                    </div>

                    <div class="reactions">

                        ${reactionList.map(([code, emoji]) => `
                            <button
                                class="reaction-btn"
                                data-reaction="${code}"
                                onclick="react('${code}')"
                            >
                                <span>${emoji}</span>
                                <strong>${reactionCounts[code] || 0}</strong>
                            </button>
                        `).join("")}

                    </div>

                    <section class="comments-section">

                        <h2>Commentaires</h2>

                        <form id="cf">

                            <textarea
                                id="cc"
                                placeholder="Votre commentaire..."
                                required
                            ></textarea>

                            <button class="btn red" type="submit">
                                Commenter
                            </button>

                        </form>

                        <div class="comments-list">

                            ${
                                a.comments.map(c => `
                                    <article class="comment">

                                        <b>${esc(c.name)}</b>

                                        <small>
                                            ${new Date(c.created_at).toLocaleString("fr-FR")}
                                        </small>

                                        <p>${esc(c.content)}</p>

                                    </article>
                                `).join("")
                                || "<p>Aucun commentaire.</p>"
                            }

                        </div>

                    </section>

                </main>

                <aside class="article-sidebar">

                    <h2>Dernières actualités</h2>

                    <div class="latest-list">

                        ${
                            latest.length
                            ? latest.map(item => `
                                <a
                                    class="latest-article"
                                    href="/article.html?id=${item.id}"
                                >

                                    ${
                                        item.image
                                        ? `
                                        <img
                                            src="${esc(item.image)}"
                                            alt="${esc(item.title)}"
                                        >
                                        `
                                        : `
                                        <div class="latest-placeholder">
                                            📰
                                        </div>
                                        `
                                    }

                                    <div class="latest-content">

                                        <h3>
                                            ${esc(item.title)}
                                        </h3>

                                        <small>
                                            ${formatDate(item.created_at)}
                                        </small>

                                    </div>

                                </a>
                            `).join("")
                            : `
                                <p class="empty-latest">
                                    Aucune actualité récente.
                                </p>
                            `
                        }

                    </div>

                </aside>

            </div>

        </div>
    `;

    document.getElementById("cf").onsubmit = async e => {

        e.preventDefault();

        const r = await fetch(
            "/api/articles/" + id + "/comments",
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    content: document.getElementById("cc").value
                })
            }
        );

        if (r.status === 401) {
            location = "/login.html";
            return;
        }

        load();
    };
}

async function react(reaction) {

    const button = document.querySelector(
        `[data-reaction="${reaction}"]`
    );

    if (button) {
        button.disabled = true;
    }

    const r = await fetch(
        "/api/articles/" + id + "/reactions",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                reaction: reaction
            })
        }
    );

    if (r.status === 401) {
        location = "/login.html";
        return;
    }

    const data = await r.json().catch(() => ({}));

    if (!r.ok) {

        alert(
            data.error ||
            "Erreur lors de la réaction."
        );

        if (button) {
            button.disabled = false;
        }

        return;
    }

    await load();
}

function formatDate(date) {

    if (!date) return "";

    return new Date(date).toLocaleDateString(
        "fr-FR",
        {
            day: "2-digit",
            month: "long",
            year: "numeric"
        }
    );
}

function esc(s) {

    return String(s ?? "").replace(
        /[&<>"']/g,
        m => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[m])
    );
}

load();
