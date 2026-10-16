const express = require("express");
const pool = require("./db");

const app = express();
const PORT = 2300;

app.use(express.json());

app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            status: "healthy",
            application: "GadgetApp API",
            database: "connected"
        });
    } catch (error) {
        console.error("Health check failed:", error.message);

        res.status(503).json({
            status: "unhealthy",
            database: "unavailable"
        });
    }
});

app.get("/api/gadgets", async (req, res) => {
    try {
        const result = await pool.query(
            "SELECT id, name, category, price FROM gadgets ORDER BY id"
        );

        res.json(result.rows);
    } catch (error) {
        console.error("Failed to retrieve gadgets:", error.message);

        res.status(500).json({
            error: "Failed to retrieve gadgets"
        });
    }
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`GadgetApp API listening on port ${PORT}`);
});