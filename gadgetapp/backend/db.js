const { Pool } = require("pg");

const pool = new Pool({
    host: process.env.DB_HOST || "database",
    port: Number(process.env.DB_PORT || 5432),
    database: process.env.DB_NAME || "gadgetdb",
    user: process.env.DB_USER || "gadgetuser",
    password: process.env.DB_PASSWORD,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    max: Number(process.env.DB_POOL_MAX || 10),
    ...(process.env.DB_SSL === "true"
        ? { ssl: { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" } }
        : {})
});

pool.on("error", (error) => {
    console.error("Unexpected PostgreSQL pool error:", error.message);
});

module.exports = pool;
