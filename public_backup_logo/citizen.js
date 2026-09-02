
let currentUser = null;

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


/* ================================
   CHARGEMENT DU COMPTE
================================ */

async function loadUser() {

    const data = await api("/api/me");

    if (!data.user) {
        location = "/login.html";
        return;
    }

    currentUser = data.user;

    $("who").innerHTML = `
        <label>COMPTE CITOYEN</label>

        <h1>
             Bonjour, cher citoyen de San Andreas 👋 👋
        </h1>
                Bienvenue dans votre espace citoyen du Weazel News.
    Ici, vous pouvez transmettre vos demandes et informations à notre rédaction.
        <p>
           
        </p>
    `;

}


/* ================================
   MES DEMANDES
================================ */

async function loadMyPosts() {

    try {

        const posts = await api("/api/my-posts");

        if (!posts.length) {

            $("mine").innerHTML = `
                <p>
                    Vous n'avez encore envoyé aucune demande.
                </p>
            `;

            return;
        }


        $("mine").innerHTML = posts.map(post => {

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

                        <b>
                            ${esc(post.title)}
                        </b>

                        <small>
                            ${esc(post.category)}
                        </small>

                        <span class="status ${esc(post.status)}">
                            ${statusText}
                        </span>

                        <small>
                            ${esc(
                                post.review_note ||
                                "Votre demande est actuellement étudiée par la rédaction."
                            )}
                        </small>

                    </div>

                </div>
            `;

        }).join("");


    } catch (error) {

        console.error("Chargement des demandes :", error);

        $("mine").innerHTML = `
            <p>
                Impossible de charger vos demandes.
            </p>
        `;

    }

}


/* ================================
   NOUVELLE DEMANDE
================================ */

$("requestForm").onsubmit = async event => {

    event.preventDefault();

    const button = event.target.querySelector("button");

    const status = $("requestStatus");

    try {

        button.disabled = true;

        status.textContent = "Envoi de votre demande...";


        /*
            IMPORTANT :
            AUCUNE IMAGE N'EST ENVOYEE.
        */

        await api("/api/citizen-posts", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                title: $("requestTitle").value.trim(),

                category: $("requestType").value,

                content:
                    "Contact : " +
                    $("requestContact").value.trim() +
                    "\n\n" +
                    $("requestContent").value.trim(),

                image: null

            })

        });


        status.textContent =
            "✅ Votre demande a été envoyée à la rédaction.";

        event.target.reset();

        await loadMyPosts();


    } catch (error) {

        console.error(
            "Envoi de la demande :",
            error
        );

        status.textContent =
            "❌ Erreur : " + error.message;


    } finally {

        button.disabled = false;

    }

};


/* ================================
   CONTACT REDACTION
================================ */

$("contact").onsubmit = async event => {

    event.preventDefault();

    const button =
        event.target.querySelector("button");

    try {

        button.disabled = true;

        await api("/api/contact", {

            method: "POST",

            headers: {
                "Content-Type": "application/json"
            },

            body: JSON.stringify({

                subject:
                    $("subject").value.trim(),

                message:
                    $("message").value.trim()

            })

        });


        event.target.reset();

        alert(
            "✅ Votre message a été envoyé à la rédaction."
        );


    } catch (error) {

        console.error(
            "Contact rédaction :",
            error
        );

        alert(
            "❌ Erreur : " + error.message
        );


    } finally {

        button.disabled = false;

    }

};


/* ================================
   INITIALISATION
================================ */

async function init() {

    try {

        await loadUser();

        await loadMyPosts();

    } catch (error) {

        console.error(
            "Initialisation espace citoyen :",
            error
        );

        location = "/login.html";

    }

}


init();