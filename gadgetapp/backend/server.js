
const express = require("express");
const multer = require("multer");
const pool = require("./db");
const path = require("path");
const fs = require("fs");
const crypto = require("crypto");

const app = express();
const PORT = Number(process.env.PORT || 2300);

const UPLOAD_DIR = path.resolve(
    process.env.UPLOAD_DIR || path.join(__dirname, "uploads")
);

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

app.use(express.json({ limit: "100kb" }));

const allowedTypes = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
};

const storage = multer.diskStorage({
    destination: (req, file, callback) => {
        callback(null, UPLOAD_DIR);
    },

    filename: (req, file, callback) => {
        const extension = allowedTypes[file.mimetype];

        callback(
            null,
            `${crypto.randomUUID()}${extension || ""}`
        );
    }
});

const upload = multer({
    storage,
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, callback) => {
        if (!allowedTypes[file.mimetype]) {
            return callback(
                new Error("Only JPEG, PNG, WEBP and GIF images are allowed.")
            );
        }

        callback(null, true);
    }
});

// Health check
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

// Get gadgets and their associated images
app.get("/api/gadgets", async (req, res) => {
    try {
        const result = await pool.query(`
            SELECT
                g.id,
                g.name,
                g.category,
                g.price,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', gi.id,
                            'original_name', gi.original_name,
                            'mime_type', gi.mime_type,
                            'url', '/api/images/' || gi.id
                        )
                        ORDER BY gi.created_at
                    ) FILTER (WHERE gi.id IS NOT NULL),
                    '[]'::json
                ) AS images
            FROM gadgets g
            LEFT JOIN gadget_images gi
                ON gi.gadget_id = g.id
            GROUP BY g.id
            ORDER BY g.id;
        `);

        res.json(result.rows);
    } catch (error) {
        console.error("Failed to retrieve gadgets:", error.message);

        res.status(500).json({
            error: "Failed to retrieve gadgets"
        });
    }
});

// Upload an image for a gadget
app.post(
    "/api/gadgets/:id/images",
    upload.single("image"),
    async (req, res) => {
        let savedFilePath;

        try {
            if (!req.file) {
                return res.status(400).json({
                    error: "Please select an image to upload."
                });
            }

            savedFilePath = path.join(UPLOAD_DIR, req.file.filename);

            const gadgetId = Number(req.params.id);

            if (!Number.isInteger(gadgetId) || gadgetId < 1) {
                fs.unlink(savedFilePath, () => {});
                return res.status(400).json({
                    error: "Invalid gadget ID."
                });
            }

            const gadget = await pool.query(
                "SELECT id FROM gadgets WHERE id = $1",
                [gadgetId]
            );

            if (gadget.rowCount === 0) {
                fs.unlink(savedFilePath, () => {});
                return res.status(404).json({
                    error: "Gadget not found."
                });
            }

            const result = await pool.query(
                `INSERT INTO gadget_images
                    (gadget_id, original_name, stored_name, mime_type, file_size)
                 VALUES ($1, $2, $3, $4, $5)
                 RETURNING id, gadget_id, original_name, mime_type`,
                [
                    gadgetId,
                    path.basename(req.file.originalname).slice(0, 255),
                    req.file.filename,
                    req.file.mimetype,
                    req.file.size
                ]
            );

            res.status(201).json({
                message: "Image uploaded successfully.",
                image: {
                    ...result.rows[0],
                    url: `/api/images/${result.rows[0].id}`
                }
            });
        } catch (error) {
            if (savedFilePath) {
                fs.unlink(savedFilePath, () => {});
            }

            console.error("Image upload failed:", error.message);

            res.status(500).json({
                error: "Image upload failed."
            });
        }
    }
);

// Display an image in the browser
app.get("/api/images/:id", async (req, res) => {
    try {
        const imageId = Number(req.params.id);

        if (!Number.isInteger(imageId) || imageId < 1) {
            return res.status(400).json({ error: "Invalid image ID." });
        }

        const result = await pool.query(
            `SELECT stored_name, mime_type
             FROM gadget_images
             WHERE id = $1`,
            [imageId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Image not found." });
        }

        const image = result.rows[0];
        const filePath = path.join(UPLOAD_DIR, image.stored_name);

        res.setHeader("Content-Type", image.mime_type);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, max-age=3600");

        res.sendFile(filePath, (error) => {
            if (error && !res.headersSent) {
                res.status(error.statusCode === 404 ? 404 : 500)
                    .json({ error: "Unable to read image file." });
            }
        });
    } catch (error) {
        console.error("Image retrieval failed:", error.message);

        if (!res.headersSent) {
            res.status(500).json({ error: "Unable to retrieve image." });
        }
    }
});

// Download an image
app.get("/api/images/:id/download", async (req, res) => {
    try {
        const imageId = Number(req.params.id);

        if (!Number.isInteger(imageId) || imageId < 1) {
            return res.status(400).json({ error: "Invalid image ID." });
        }

        const result = await pool.query(
            `SELECT stored_name, original_name, mime_type
             FROM gadget_images
             WHERE id = $1`,
            [imageId]
        );

        if (result.rowCount === 0) {
            return res.status(404).json({ error: "Image not found." });
        }

        const image = result.rows[0];
        const filePath = path.join(UPLOAD_DIR, image.stored_name);

        res.download(filePath, image.original_name, (error) => {
            if (error && !res.headersSent) {
                res.status(error.statusCode === 404 ? 404 : 500)
                    .json({ error: "Unable to download image." });
            }
        });
    } catch (error) {
        console.error("Image download failed:", error.message);

        if (!res.headersSent) {
            res.status(500).json({ error: "Unable to download image." });
        }
    }
});

// Handle upload errors, including oversized and unsupported files
app.use((error, req, res, next) => {
    if (res.headersSent) {
        return next(error);
    }

    if (error instanceof multer.MulterError) {
        const message = error.code === "LIMIT_FILE_SIZE"
            ? "Image must be 5 MB or smaller."
            : "Upload rejected. Please select one image.";

        return res.status(400).json({ error: message });
    }

    if (error.message?.startsWith("Only JPEG")) {
        return res.status(400).json({ error: error.message });
    }

    console.error("Request error:", error.message);

    res.status(500).json({ error: "An unexpected server error occurred." });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`GadgetApp API listening on port ${PORT}`);
});
