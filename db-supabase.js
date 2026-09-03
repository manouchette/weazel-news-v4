require("dotenv").config();

const postgres = require("postgres");

if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL absente du fichier .env");
}

const sql = postgres(process.env.DATABASE_URL, {
    ssl: "require",
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15
});

function convertPlaceholders(query) {
    let index = 0;

    return query.replace(/\?/g, () => {
        index++;
        return "$" + index;
    });
}

async function all(query, params = []) {
    const converted = convertPlaceholders(query);
    return await sql.unsafe(converted, params);
}

async function get(query, params = []) {
    const rows = await all(query, params);
    return rows[0] || undefined;
}

async function run(query, params = []) {
    const converted = convertPlaceholders(query);

    const rows = await sql.unsafe(converted, params);

    return {
        rows,
        changes: rows.count ?? rows.length ?? 0,
        lastInsertRowid: rows[0]?.id ?? null
    };
}

async function transaction(callback) {
    return await sql.begin(async tx => {
        return await callback(tx);
    });
}

async function close() {
    await sql.end();
}

module.exports = {
    sql,
    all,
    get,
    run,
    transaction,
    close
};