const videoGrid = document.getElementById("videoGrid");


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


function youtubeEmbed(url) {

    try {

        const value = String(url || "").trim();
        const parsed = new URL(value);

        if (parsed.hostname === "youtu.be") {
            const id = parsed.pathname.slice(1).split(/[?&]/)[0];

            return id
                ? "https://www.youtube.com/embed/" + id
                : "";
        }

        if (
            parsed.hostname.includes("youtube.com") &&
            parsed.pathname === "/watch"
        ) {
            const id = parsed.searchParams.get("v");

            return id
                ? "https://www.youtube.com/embed/" + id
                : "";
        }

        if (
            parsed.hostname.includes("youtube.com") &&
            parsed.pathname.startsWith("/shorts/")
        ) {
            const id =
                parsed.pathname
                    .split("/shorts/")[1]
                    .split(/[?&]/)[0];

            return id
                ? "https://www.youtube.com/embed/" + id
                : "";
        }

    } catch (error) {

        console.error(
            "Lien YouTube invalide :",
            error
        );
    }

    return "";
}


async function loadVideos() {

    try {

        const response =
            await fetch("/api/videos");

        if (!response.ok) {
            throw new Error("Impossible de charger les reportages.");
        }

        const videos =
            await response.json();

        if (!videos.length) {

            videoGrid.innerHTML = `
                <div class="empty-video">
                    <h2>Aucun reportage vidéo</h2>
                    <p>
                        Aucun reportage vidéo n'est encore disponible.
                    </p>
                </div>
            `;

            return;
        }


        videoGrid.innerHTML =
            videos.map(video => {

                const embed =
                    youtubeEmbed(video.youtube);

                return `

                    <article class="video-card">

                        ${
                            embed
                                ? `
                                    <div class="video-frame">
                                        <iframe
                                            src="${esc(embed)}"
                                            title="${esc(video.title)}"
                                            loading="lazy"
                                            frameborder="0"
                                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                                            allowfullscreen
                                        ></iframe>
                                    </div>
                                `
                                : ""
                        }

                        <div class="video-body">

                            <label>
                                REPORTAGE VIDÉO
                            </label>

                            <h2>
                                ${esc(video.title)}
                            </h2>

                            ${
                                video.caption
                                    ? `
                                        <p>
                                            ${esc(video.caption)}
                                        </p>
                                    `
                                    : ""
                            }

                            <a
                                class="btn red"
                                href="${esc(video.youtube)}"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                ▶ Voir sur YouTube
                            </a>

                        </div>

                    </article>

                `;

            }).join("");

    } catch (error) {

        console.error(
            "Reportages vidéo :",
            error
        );

        videoGrid.innerHTML = `
            <div class="empty-video">
                <h2>Erreur</h2>
                <p>${esc(error.message)}</p>
            </div>
        `;
    }
}


loadVideos();