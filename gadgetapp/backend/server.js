const express = require("express");
const multer = require("multer");
const session = require("express-session");
const connectPgSimple = require("connect-pg-simple");
const bcrypt = require("bcryptjs");
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
const SESSION_SECRET = process.env.SESSION_SECRET;
const PgSession = connectPgSimple(session);

if (!SESSION_SECRET || SESSION_SECRET.length < 32) {
    throw new Error(
        "SESSION_SECRET must be set to a random secret of at least 32 characters."
    );
}

if (process.env.NODE_ENV === "production") {
    // Required when HTTPS terminates at a trusted reverse proxy.
    app.set("trust proxy", 1);
}

const s3 = new S3Client({
    region: process.env.AWS_REGION
});

app.use(express.json({ limit: "100kb" }));

app.use(session({
    name: "gadgetapp.sid",
    store: new PgSession({
        pool,
        tableName: "user_sessions",
        createTableIfMissing: true
    }),
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 1000 * 60 * 60 * 24
    }
}));

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
                new Error("Only JPEG, PNG, WEBP and GIF images are allowed.")
            );
        }
        callback(null, true);
    }
});

function validateId(value) {
    const id = Number(value);
    return Number.isSafeInteger(id) && id > 0 ? id : null;
}

function requireS3Config(res) {
    if (!S3_BUCKET_NAME || !process.env.AWS_REGION) {
        res.status(503).json({ error: "S3 storage is not configured." });
        return false;
    }
    return true;
}

function requireAuth(req, res, next) {
    if (!req.session || !req.session.userId) {
        return res.status(401).json({
            error: "Please create an account or sign in first."
        });
    }
    next();
}

function normalizeEmail(value) {
    return typeof value === "string" ? value.trim().toLowerCase() : "";
}

function validEmail(value) {
    return value.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function validUsername(value) {
    return typeof value === "string" &&
        /^[a-zA-Z0-9_.-]{3,30}$/.test(value);
}

function publicUser(row) {
    return {
        id: row.id,
        username: row.username,
        email: row.email
    };
}

function regenerateSession(req) {
    return new Promise((resolve, reject) => {
        req.session.regenerate((error) => error ? reject(error) : resolve());
    });
}

function saveSession(req) {
    return new Promise((resolve, reject) => {
        req.session.save((error) => error ? reject(error) : resolve());
    });
}

// Ensure the account table exists and add ownership to existing image records.
// Existing images are retained and have user_id NULL until explicitly assigned.
async function initializeDatabase() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS app_users (
            id BIGSERIAL PRIMARY KEY,
            username VARCHAR(30) NOT NULL UNIQUE,
            email VARCHAR(254) NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
    `);

    await pool.query(`
        ALTER TABLE gadget_images
        ADD COLUMN IF NOT EXISTS user_id BIGINT
        REFERENCES app_users(id) ON DELETE SET NULL;
    `);

    await pool.query(`
        CREATE INDEX IF NOT EXISTS gadget_images_user_id_idx
        ON gadget_images(user_id);
    `);
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

// Register an account.
app.post("/api/auth/register", async (req, res) => {
    try {
        const username = typeof req.body.username === "string"
            ? req.body.username.trim()
            : "";
        const email = normalizeEmail(req.body.email);
        const password = typeof req.body.password === "string"
            ? req.body.password
            : "";

        if (!validUsername(username)) {
            return res.status(400).json({
                error: "Username must be 3–30 characters and use letters, numbers, dots, underscores or hyphens."
            });
        }

        if (!validEmail(email)) {
            return res.status(400).json({ error: "Enter a valid email address." });
        }

        if (password.length < 12 || password.length > 128) {
            return res.status(400).json({
                error: "Password must be between 12 and 128 characters."
            });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const result = await pool.query(
            `INSERT INTO app_users (username, email, password_hash)
             VALUES ($1, $2, $3)
             RETURNING id, username, email`,
            [username, email, passwordHash]
        );

        const user = publicUser(result.rows[0]);

        // Sign the newly registered user in with a fresh session ID.
        await regenerateSession(req);
        req.session.userId = user.id;
        await saveSession(req);

        return res.status(201).json({
            message: "Account created successfully.",
            user
        });
    } catch (error) {
        if (error.code === "23505") {
            return res.status(409).json({
                error: "That username or email is already registered."
            });
        }

        console.error("Registration failed:", error.message);
        return res.status(500).json({ error: "Unable to create account." });
    }
});

// Sign in.
app.post("/api/auth/login", async (req, res) => {
    try {
        const email = normalizeEmail(req.body.email);
        const password = typeof req.body.password === "string"
            ? req.body.password
            : "";

        if (!validEmail(email) || !password) {
            return res.status(400).json({
                error: "Enter your email address and password."
            });
        }

        const result = await pool.query(
            `SELECT id, username, email, password_hash
             FROM app_users
             WHERE email = $1`,
            [email]
        );

        if (
            result.rowCount === 0 ||
            !(await bcrypt.compare(password, result.rows[0].password_hash))
        ) {
            return res.status(401).json({
                error: "Invalid email or password."
            });
        }

        const user = publicUser(result.rows[0]);
        await regenerateSession(req);
        req.session.userId = user.id;
        await saveSession(req);

        return res.json({ message: "Signed in successfully.", user });
    } catch (error) {
        console.error("Login failed:", error.message);
        return res.status(500).json({ error: "Unable to sign in." });
    }
});

// Return the current account.
app.get("/api/auth/me", async (req, res) => {
    try {
        if (!req.session.userId) {
            return res.status(401).json({ error: "Not signed in." });
        }

        const result = await pool.query(
            "SELECT id, username, email FROM app_users WHERE id = $1",
            [req.session.userId]
        );

        if (result.rowCount === 0) {
            req.session.destroy(() => {});
            return res.status(401).json({ error: "Session is no longer valid." });
        }

        return res.json({ user: publicUser(result.rows[0]) });
    } catch (error) {
        console.error("Session lookup failed:", error.message);
        return res.status(500).json({ error: "Unable to check your account." });
    }
});

// Sign out.
app.post("/api/auth/logout", (req, res) => {
    if (!req.session) {
        return res.json({ message: "Signed out." });
    }

    req.session.destroy((error) => {
        if (error) {
            console.error("Logout failed:", error.message);
            return res.status(500).json({ error: "Unable to sign out." });
        }

        res.clearCookie("gadgetapp.sid", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax"
        });
        return res.json({ message: "Signed out successfully." });
    });
});

// Get gadgets and associated image metadata.
// Images uploaded by the signed-in user are marked can_delete: true.
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
                            'url', '/api/images/' || gi.id,
                            'can_delete',
                                (gi.user_id = $1::bigint)
                        )
                        ORDER BY gi.created_at
                    ) FILTER (WHERE gi.id IS NOT NULL),
                    '[]'::json
                ) AS images
            FROM gadgets g
            LEFT JOIN gadget_images gi ON gi.gadget_id = g.id
            GROUP BY g.id
            ORDER BY g.id;
        `, [req.session.userId || null]);

        res.json(result.rows);
    } catch (error) {
        console.error("Failed to retrieve gadgets:", error.message);
        res.status(500).json({ error: "Failed to retrieve gadgets." });
    }
});

// Upload an image to S3 and save its metadata in PostgreSQL.
// Authentication runs before Multer reads the upload.
app.post(
    "/api/gadgets/:id/images",
    requireAuth,
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

            const gadgetId = validateId(req.params.id);
            if (!gadgetId) {
                return res.status(400).json({ error: "Invalid gadget ID." });
            }

            const gadget = await pool.query(
                "SELECT id FROM gadgets WHERE id = $1",
                [gadgetId]
            );

            if (gadget.rowCount === 0) {
                return res.status(404).json({ error: "Gadget not found." });
            }

            const extension = allowedTypes[req.file.mimetype];
            objectKey = `gadgets/${gadgetId}/${crypto.randomUUID()}${extension}`;

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
                         mime_type, file_size, user_id)
                     VALUES ($1, $2, $3, $4, $5, $6)
                     RETURNING id, gadget_id, original_name, mime_type`,
                    [
                        gadgetId,
                        path.basename(req.file.originalname).slice(0, 255),
                        objectKey,
                        req.file.mimetype,
                        req.file.size,
                        req.session.userId
                    ]
                );

                const image = result.rows[0];
                return res.status(201).json({
                    message: "Image uploaded successfully to S3.",
                    image: {
                        ...image,
                        url: `/api/images/${image.id}`,
                        can_delete: true
                    }
                });
            } catch (dbError) {
                try {
                    await s3.send(new DeleteObjectCommand({
                        Bucket: S3_BUCKET_NAME,
                        Key: objectKey
                    }));
                } catch (cleanupError) {
                    console.error("S3 cleanup failed:", cleanupError.message);
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

            return res.status(500).json({ error: "Image upload failed." });
        }
    }
);

// Delete only an image owned by the signed-in user.
app.delete(
    "/api/gadgets/:id/images/:imageId",
    requireAuth,
    async (req, res) => {
        try {
            if (!requireS3Config(res)) return;

            const gadgetId = validateId(req.params.id);
            const imageId = validateId(req.params.imageId);

            if (!gadgetId || !imageId) {
                return res.status(400).json({ error: "Invalid gadget or image ID." });
            }

            const result = await pool.query(
                `SELECT id, stored_name
                 FROM gadget_images
                 WHERE id = $1 AND gadget_id = $2 AND user_id = $3`,
                [imageId, gadgetId, req.session.userId]
            );

            if (result.rowCount === 0) {
                return res.status(404).json({
                    error: "Image not found or you do not have permission to delete it."
                });
            }

            const image = result.rows[0];

            await s3.send(new DeleteObjectCommand({
                Bucket: S3_BUCKET_NAME,
                Key: image.stored_name
            }));

            await pool.query(
                "DELETE FROM gadget_images WHERE id = $1 AND user_id = $2",
                [imageId, req.session.userId]
            );

            return res.json({ message: "Image deleted successfully." });
        } catch (error) {
            console.error("Image deletion failed:", error.message);

            if (error.name === "AccessDenied") {
                return res.status(502).json({
                    error: "AWS denied permission to delete this S3 object. Check IAM permissions."
                });
            }

            return res.status(500).json({ error: "Image deletion failed." });
        }
    }
);

// Retrieve an image from S3 for browser display.
app.get("/api/images/:id", async (req, res) => {
    try {
        if (!requireS3Config(res)) return;

        const imageId = validateId(req.params.id);
        if (!imageId) {
            return res.status(400).json({ error: "Invalid image ID." });
        }

        const result = await pool.query(
            "SELECT stored_name, mime_type FROM gadget_images WHERE id = $1",
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
            res.status(error.name === "NoSuchKey" ? 404 : 500).json({
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

        const imageId = validateId(req.params.id);
        if (!imageId) {
            return res.status(400).json({ error: "Invalid image ID." });
        }

        const result = await pool.query(
            `SELECT stored_name, original_name, mime_type
             FROM gadget_images WHERE id = $1`,
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
            res.status(error.name === "NoSuchKey" ? 404 : 500).json({
                error: error.name === "NoSuchKey"
                    ? "Image file not found in S3."
                    : "Unable to download image."
            });
        }
    }
});

// Handle upload and request errors.
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
    return res.status(500).json({
        error: "An unexpected server error occurred."
    });
});

async function startServer() {
    await initializeDatabase();

    app.listen(PORT, "0.0.0.0", () => {
        console.log(`GadgetApp API listening on port ${PORT}`);
    });
}

startServer().catch((error) => {
    console.error("GadgetApp startup failed:", error.message);
    process.exit(1);
});
