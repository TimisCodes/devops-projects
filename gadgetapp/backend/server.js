
const express = require("express");
const multer = require("multer");
const pool = require("./db");
const path = require("path");
const crypto = require("crypto");

const {
    S3Client,
    PutObjectCommand,
    GetObjectCommand,
    DeleteObjectCommand
} = require("@aws-sdk/client-s3");

const app = express();
const PORT = Number(process.env.PORT || 2300);
const S3_BUCKET_NAME = process.env.S3_BUCKET_NAME;

const s3 = new S3Client({
    region: process.env.AWS_REGION
});

app.use(express.json({ limit: "100kb" }));

const allowedTypes = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif"
};

// Receive images in memory, not in the container filesystem.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 5 * 1024 * 1024,
        files: 1
    },
    fileFilter: (req, file, callback) => {
        if (!allowedTypes[file.mimetype]) {
            return callback(
                new Error(
                    "Only JPEG, PNG, WEBP and GIF images are allowed."
                )
            );
        }

        callback(null, true);
    }
});

function validateImageId(value) {
    const id = Number(value);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function requireS3Config(res) {
    if (!S3_BUCKET_NAME || !process.env.AWS_REGION) {
        res.status(503).json({
            error: "S3 storage is not configured."
        });
        return false;
    }

    return true;
}

// Health check
app.get("/api/health", async (req, res) => {
    try {
        await pool.query("SELECT 1");

        res.json({
            status: "healthy",
            application: "GadgetApp API",
            database: "connected",
            imageStorage: S3_BUCKET_NAME ? "S3 configured" : "not configured"
        });
    } catch (error) {
        console.error("Health check failed:", error.message);

        res.status(503).json({
            status: "unhealthy",
            database: "unavailable"
        });
    }
});

// Get gadgets and associated image metadata.
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
            error: "Failed to retrieve gadgets."
        });
    }
});

// Upload an image to S3, then save its metadata in PostgreSQL.
app.post(
    "/api/gadgets/:id/images",
    upload.single("image"),
    async (req, res) => {
        let objectKey;

        try {
            if (!requireS3Config(res)) return;

            if (!req.file) {
                return res.status(400).json({
                    error: "Please select an image to upload."
                });
            }

            const gadgetId = validateImageId(req.params.id);

            if (!gadgetId) {
                return res.status(400).json({
                    error: "Invalid gadget ID."
                });
            }

            const gadget = await pool.query(
                "SELECT id FROM gadgets WHERE id = $1",
                [gadgetId]
            );

            if (gadget.rowCount === 0) {
                return res.status(404).json({
                    error: "Gadget not found."
                });
            }

            const extension = allowedTypes[req.file.mimetype];
            objectKey =
                `gadgets/${gadgetId}/${crypto.randomUUID()}${extension}`;

            await s3.send(new PutObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: objectKey,
                Body: req.file.buffer,
                ContentType: req.file.mimetype
            }));

            try {
                const result = await pool.query(
                    `INSERT INTO gadget_images
                        (gadget_id, original_name, stored_name,
                         mime_type, file_size)
                     VALUES ($1, $2, $3, $4, $5)
                     RETURNING id, gadget_id, original_name, mime_type`,
                    [
                        gadgetId,
                        path.basename(req.file.originalname).slice(0, 255),
                        objectKey,
                        req.file.mimetype,
                        req.file.size
                    ]
                );

                const image = result.rows[0];

                return res.status(201).json({
                    message: "Image uploaded successfully to S3.",
                    image: {
                        ...image,
                        url: `/api/images/${image.id}`
                    }
                });
            } catch (dbError) {
                // Avoid leaving an orphaned S3 object if metadata insert fails.
                try {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: S3_BUCKET_NAME,
                        Key: objectKey
                    }));
                } catch (cleanupError) {
                    console.error(
                        "S3 cleanup failed:",
                        cleanupError.message
                    );
                }

                throw dbError;
            }
        } catch (error) {
            console.error("Image upload failed:", error.message);

            if (error.name === "AccessDenied") {
                return res.status(502).json({
                    error: "AWS denied access to the S3 bucket. Check IAM permissions."
                });
            }

            return res.status(500).json({
                error: "Image upload failed."
            });
        }
    }
);

// Retrieve an image from S3 for browser display.
app.get("/api/images/:id", async (req, res) => {
    try {
        if (!requireS3Config(res)) return;

        const imageId = validateImageId(req.params.id);

        if (!imageId) {
            return res.status(400).json({
                error: "Invalid image ID."
            });
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

        const object = await s3.send(new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: image.stored_name
        }));

        res.setHeader("Content-Type", image.mime_type);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader("Cache-Control", "private, max-age=3600");

        object.Body.on("error", (error) => {
            console.error("S3 image stream failed:", error.message);
            if (!res.headersSent) res.status(500);
            res.destroy(error);
        });

        object.Body.pipe(res);
    } catch (error) {
        console.error("Image retrieval failed:", error.message);

        if (!res.headersSent) {
            res.status(
                error.name === "NoSuchKey" ? 404 : 500
            ).json({
                error: error.name === "NoSuchKey"
                    ? "Image file not found in S3."
                    : "Unable to retrieve image."
            });
        }
    }
});

// Download an image from S3.
app.get("/api/images/:id/download", async (req, res) => {
    try {
        if (!requireS3Config(res)) return;

        const imageId = validateImageId(req.params.id);

        if (!imageId) {
            return res.status(400).json({
                error: "Invalid image ID."
            });
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

        const object = await s3.send(new GetObjectCommand({
            Bucket: S3_BUCKET_NAME,
            Key: image.stored_name
        }));

        res.setHeader("Content-Type", image.mime_type);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.attachment(path.basename(image.original_name));

        object.Body.on("error", (error) => {
            console.error("S3 download stream failed:", error.message);
            if (!res.headersSent) res.status(500);
            res.destroy(error);
        });

        object.Body.pipe(res);
    } catch (error) {
        console.error("Image download failed:", error.message);

        if (!res.headersSent) {
            res.status(
                error.name === "NoSuchKey" ? 404 : 500
            ).json({
                error: error.name === "NoSuchKey"
                    ? "Image file not found in S3."
                    : "Unable to download image."
            });
        }
    }
});

// Handle upload errors.
app.use((error, req, res, next) => {
    if (res.headersSent) return next(error);

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

    res.status(500).json({
        error: "An unexpected server error occurred."
    });
});

app.listen(PORT, "0.0.0.0", () => {
    console.log(`GadgetApp API listening on port ${PORT}`);
});
