const express = require("express");
const cors = require("cors");
const multer = require("multer");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcryptjs");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const app = express();
const PORT = Number(process.env.PORT || 3001);
const UPLOADS_DIR = path.join(__dirname, "uploads");
const METADATA_FILE = path.join(UPLOADS_DIR, "metadata.json");
const DATA_DIR = path.join(__dirname, "data");
const DB_PATH = path.join(DATA_DIR, "app.db");
const ADMIN_RESET_MARKER = path.join(DATA_DIR, ".admin-reset-done");

let db;

app.use(cors());
app.use(express.json());

async function ensureStorageFiles() {
    if (!fs.existsSync(UPLOADS_DIR)) {
        await fsp.mkdir(UPLOADS_DIR, { recursive: true });
    }

    if (!fs.existsSync(METADATA_FILE)) {
        await fsp.writeFile(METADATA_FILE, "[]", "utf8");
    }
}

function dbRun(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.run(sql, params, function onRun(error) {
            if (error) {
                reject(error);
                return;
            }

            resolve({ id: this.lastID, changes: this.changes });
        });
    });
}

function dbGet(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.get(sql, params, (error, row) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(row);
        });
    });
}

function dbAll(sql, params = []) {
    return new Promise((resolve, reject) => {
        db.all(sql, params, (error, rows) => {
            if (error) {
                reject(error);
                return;
            }

            resolve(rows);
        });
    });
}

async function ensureDatabase() {
    if (!fs.existsSync(DATA_DIR)) {
        await fsp.mkdir(DATA_DIR, { recursive: true });
    }

    db = new sqlite3.Database(DB_PATH);

    await dbRun(`
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL UNIQUE,
            password_hash TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'student',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    await dbRun(`
        CREATE TABLE IF NOT EXISTS presets (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            name TEXT NOT NULL,
            settings_json TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            UNIQUE(username, name)
        )
    `);

    await dbRun(`
        CREATE TABLE IF NOT EXISTS sessions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT NOT NULL,
            input_source TEXT,
            mode TEXT,
            duration_ms INTEGER,
            avg_level REAL,
            peak_level REAL,
            beat_count INTEGER,
            sample_count INTEGER,
            started_at TEXT,
            ended_at TEXT,
            session_json TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // One-time migration: clear old users and keep admin only.
    await resetUsersToAdminOnlyOnce();
}

async function resetUsersToAdminOnlyOnce() {
    if (fs.existsSync(ADMIN_RESET_MARKER)) {
        const admin = await dbGet("SELECT id FROM users WHERE username = ?", ["admin"]);
        if (!admin) {
            const adminHash = bcrypt.hashSync("admin123", 10);
            await dbRun(
                "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
                ["admin", adminHash, "admin"]
            );
        }
        return;
    }

    const adminHash = bcrypt.hashSync("admin123", 10);
    await dbRun("DELETE FROM users WHERE username <> ?", ["admin"]);

    const admin = await dbGet("SELECT id FROM users WHERE username = ?", ["admin"]);
    if (!admin) {
        await dbRun(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            ["admin", adminHash, "admin"]
        );
    } else {
        await dbRun(
            "UPDATE users SET password_hash = ?, role = ? WHERE username = ?",
            [adminHash, "admin", "admin"]
        );
    }

    await fsp.writeFile(ADMIN_RESET_MARKER, "done", "utf8");
}

async function readMetadata() {
    try {
        const raw = await fsp.readFile(METADATA_FILE, "utf8");
        const data = JSON.parse(raw);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        return [];
    }
}

async function readMetadataWithOwners() {
    const metadata = await readMetadata();
    let changed = false;

    const normalized = metadata.map((item) => {
        if (item.uploadedBy) {
            return item;
        }

        changed = true;
        return { ...item, uploadedBy: "admin" };
    });

    if (changed) {
        await writeMetadata(normalized);
    }

    return normalized;
}

function getRequestAuth(req) {
    const username = String(req.headers["x-auth-user"] || "").trim().toLowerCase();
    const role = req.headers["x-auth-role"] === "admin" ? "admin" : "student";
    return { username, role };
}

function requireAuth(req, res, next) {
    const auth = getRequestAuth(req);
    if (!auth.username) {
        return res.status(401).json({ success: false, message: "Login required" });
    }

    req.auth = auth;
    return next();
}

async function writeMetadata(items) {
    await fsp.writeFile(METADATA_FILE, JSON.stringify(items, null, 2), "utf8");
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, UPLOADS_DIR);
    },
    filename: (req, file, cb) => {
        const safeOriginal = file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_");
        cb(null, `${Date.now()}-${safeOriginal}`);
    }
});

function mediaFilter(req, file, cb) {
    const type = file.mimetype || "";
    if (type.startsWith("audio/") || type.startsWith("video/")) {
        cb(null, true);
    } else {
        cb(new Error("Only audio or video files are allowed."));
    }
}

const upload = multer({
    storage,
    fileFilter: mediaFilter,
    limits: { fileSize: 25 * 1024 * 1024 }
});

app.post("/register", async (req, res) => {
    const { username, password } = req.body;
    const role = "student";

    const cleanUsername = String(username || "").trim().toLowerCase();
    const cleanPassword = String(password || "");

    if (!/^[a-z0-9_]{3,20}$/.test(cleanUsername)) {
        return res.status(400).json({
            success: false,
            message: "Username must be 3-20 chars (letters, numbers, underscore only)"
        });
    }

    if (cleanPassword.length < 6) {
        return res.status(400).json({
            success: false,
            message: "Password must be at least 6 characters"
        });
    }

    try {
        const hash = bcrypt.hashSync(cleanPassword, 10);
        await dbRun(
            "INSERT INTO users (username, password_hash, role) VALUES (?, ?, ?)",
            [cleanUsername, hash, role]
        );

        return res.json({
            success: true,
            message: "User created successfully",
            username: cleanUsername,
            role
        });
    } catch (error) {
        if (String(error.message).includes("UNIQUE")) {
            return res.status(409).json({ success: false, message: "Username already exists" });
        }

        return res.status(500).json({ success: false, message: "Could not create user" });
    }
});

app.post("/login", async (req, res) => {
    const { username, password } = req.body;

    const cleanUsername = String(username || "").trim().toLowerCase();
    const cleanPassword = String(password || "");

    const found = await dbGet(
        "SELECT username, password_hash, role FROM users WHERE username = ?",
        [cleanUsername]
    );

    if (!found || !bcrypt.compareSync(cleanPassword, found.password_hash)) {
        return res.status(401).json({ success: false, message: "Invalid username or password" });
    }

    return res.json({
        success: true,
        message: "Login successful",
        username: found.username,
        role: found.role
    });
});

app.get("/users", requireAuth, async (req, res) => {
    if (req.auth.role !== "admin") {
        return res.status(403).json({ success: false, message: "Admin only" });
    }

    const users = await dbAll(
        "SELECT username, role, created_at AS createdAt FROM users ORDER BY created_at DESC"
    );
    return res.json({ success: true, users });
});

app.post("/upload", requireAuth, upload.single("audio"), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const metadata = await readMetadataWithOwners();
    const entry = {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mediaType: req.file.mimetype,
        uploadedBy: req.auth.username,
        uploadTime: new Date().toISOString()
    };

    metadata.unshift(entry);
    await writeMetadata(metadata);

    return res.json({ success: true, message: "File uploaded", file: entry });
});

app.get("/files", requireAuth, async (req, res) => {
    const metadata = await readMetadataWithOwners();

    if (req.auth.role === "admin") {
        const owner = String(req.query.owner || "").trim().toLowerCase();
        const files = owner
            ? metadata.filter((item) => item.uploadedBy === owner)
            : metadata;

        return res.json({ success: true, files });
    }

    const files = metadata.filter((item) => item.uploadedBy === req.auth.username);

    return res.json({ success: true, files });
});

app.get("/presets", requireAuth, async (req, res) => {
    const presets = await dbAll(
        "SELECT id, name, settings_json AS settingsJson, updated_at AS updatedAt FROM presets WHERE username = ? ORDER BY updated_at DESC",
        [req.auth.username]
    );

    const mapped = presets.map((item) => {
        let settings = {};
        try {
            settings = JSON.parse(item.settingsJson);
        } catch (error) {
            settings = {};
        }

        return {
            id: item.id,
            name: item.name,
            updatedAt: item.updatedAt,
            settings
        };
    });

    return res.json({ success: true, presets: mapped });
});

app.post("/presets", requireAuth, async (req, res) => {
    const name = String(req.body.name || "").trim();
    const settings = req.body.settings || {};

    if (!name || name.length > 40) {
        return res.status(400).json({ success: false, message: "Preset name must be 1-40 chars" });
    }

    const settingsJson = JSON.stringify(settings);
    const existing = await dbGet(
        "SELECT id FROM presets WHERE username = ? AND name = ?",
        [req.auth.username, name]
    );

    if (!existing) {
        await dbRun(
            "INSERT INTO presets (username, name, settings_json) VALUES (?, ?, ?)",
            [req.auth.username, name, settingsJson]
        );
    } else {
        await dbRun(
            "UPDATE presets SET settings_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?",
            [settingsJson, existing.id]
        );
    }

    return res.json({ success: true, message: "Preset saved" });
});

app.delete("/presets/:id", requireAuth, async (req, res) => {
    const presetId = Number(req.params.id);
    if (!Number.isInteger(presetId) || presetId <= 0) {
        return res.status(400).json({ success: false, message: "Invalid preset id" });
    }

    const target = await dbGet(
        "SELECT id FROM presets WHERE id = ? AND username = ?",
        [presetId, req.auth.username]
    );
    if (!target) {
        return res.status(404).json({ success: false, message: "Preset not found" });
    }

    await dbRun("DELETE FROM presets WHERE id = ?", [presetId]);
    return res.json({ success: true, message: "Preset deleted" });
});

app.post("/sessions", requireAuth, async (req, res) => {
    const {
        inputSource,
        mode,
        durationMs,
        avgLevel,
        peakLevel,
        beatCount,
        sampleCount,
        startedAt,
        endedAt
    } = req.body || {};

    const safeDuration = Math.max(0, Number(durationMs) || 0);
    const safeAvg = Number(avgLevel) || 0;
    const safePeak = Number(peakLevel) || 0;
    const safeBeat = Math.max(0, Number(beatCount) || 0);
    const safeSamples = Math.max(0, Number(sampleCount) || 0);

    await dbRun(
        `INSERT INTO sessions (
            username, input_source, mode, duration_ms, avg_level, peak_level,
            beat_count, sample_count, started_at, ended_at, session_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
            req.auth.username,
            String(inputSource || ""),
            String(mode || ""),
            safeDuration,
            safeAvg,
            safePeak,
            safeBeat,
            safeSamples,
            String(startedAt || ""),
            String(endedAt || ""),
            JSON.stringify(req.body || {})
        ]
    );

    return res.json({ success: true, message: "Session saved" });
});

app.get("/sessions", requireAuth, async (req, res) => {
    if (req.auth.role === "admin") {
        const owner = String(req.query.owner || "").trim().toLowerCase();
        const rows = owner
            ? await dbAll(
                `SELECT id, username, input_source AS inputSource, mode, duration_ms AS durationMs,
                        avg_level AS avgLevel, peak_level AS peakLevel, beat_count AS beatCount,
                        sample_count AS sampleCount, started_at AS startedAt, ended_at AS endedAt,
                        created_at AS createdAt
                   FROM sessions WHERE username = ? ORDER BY created_at DESC LIMIT 30`,
                [owner]
            )
            : await dbAll(
                `SELECT id, username, input_source AS inputSource, mode, duration_ms AS durationMs,
                        avg_level AS avgLevel, peak_level AS peakLevel, beat_count AS beatCount,
                        sample_count AS sampleCount, started_at AS startedAt, ended_at AS endedAt,
                        created_at AS createdAt
                   FROM sessions ORDER BY created_at DESC LIMIT 30`
            );

        return res.json({ success: true, sessions: rows });
    }

    const rows = await dbAll(
        `SELECT id, username, input_source AS inputSource, mode, duration_ms AS durationMs,
                avg_level AS avgLevel, peak_level AS peakLevel, beat_count AS beatCount,
                sample_count AS sampleCount, started_at AS startedAt, ended_at AS endedAt,
                created_at AS createdAt
           FROM sessions WHERE username = ? ORDER BY created_at DESC LIMIT 30`,
        [req.auth.username]
    );
    return res.json({ success: true, sessions: rows });
});

app.get("/analytics", requireAuth, async (req, res) => {
    const metadata = await readMetadataWithOwners();
    const owner = String(req.query.owner || "").trim().toLowerCase();

    if (req.auth.role !== "admin") {
        const ownFiles = metadata.filter((item) => item.uploadedBy === req.auth.username);
        const audioCount = ownFiles.filter((item) => String(item.mediaType || "").startsWith("audio/")).length;
        const videoCount = ownFiles.filter((item) => String(item.mediaType || "").startsWith("video/")).length;
        const recentBoundary = Date.now() - 24 * 60 * 60 * 1000;
        const recentUploads = ownFiles.filter((item) => {
            const time = new Date(item.uploadTime || 0).getTime();
            return Number.isFinite(time) && time >= recentBoundary;
        }).length;

        return res.json({
            success: true,
            stats: {
                totalUsers: 1,
                totalFiles: ownFiles.length,
                audioCount,
                videoCount,
                recentUploads,
                topUploader: req.auth.username
            }
        });
    }

    const users = await dbAll("SELECT username FROM users WHERE username <> ?", ["admin"]);
    const baseFiles = owner ? metadata.filter((item) => item.uploadedBy === owner) : metadata;
    const audioCount = baseFiles.filter((item) => String(item.mediaType || "").startsWith("audio/")).length;
    const videoCount = baseFiles.filter((item) => String(item.mediaType || "").startsWith("video/")).length;
    const recentBoundary = Date.now() - 24 * 60 * 60 * 1000;
    const recentUploads = baseFiles.filter((item) => {
        const time = new Date(item.uploadTime || 0).getTime();
        return Number.isFinite(time) && time >= recentBoundary;
    }).length;

    const countsByOwner = baseFiles.reduce((acc, item) => {
        const key = item.uploadedBy || "unknown";
        acc[key] = (acc[key] || 0) + 1;
        return acc;
    }, {});

    let topUploader = "-";
    let maxCount = 0;
    for (const [name, count] of Object.entries(countsByOwner)) {
        if (count > maxCount) {
            maxCount = count;
            topUploader = name;
        }
    }

    return res.json({
        success: true,
        stats: {
            totalUsers: owner ? 1 : users.length,
            totalFiles: baseFiles.length,
            audioCount,
            videoCount,
            recentUploads,
            topUploader
        }
    });
});

app.delete("/user/:username", requireAuth, async (req, res) => {
    if (req.auth.role !== "admin") {
        return res.status(403).json({ success: false, message: "Admin only" });
    }

    const target = String(req.params.username || "").trim().toLowerCase();
    if (!target) {
        return res.status(400).json({ success: false, message: "Invalid username" });
    }

    if (target === "admin") {
        return res.status(400).json({ success: false, message: "Admin user cannot be deleted" });
    }

    const user = await dbGet("SELECT id FROM users WHERE username = ?", [target]);
    if (!user) {
        return res.status(404).json({ success: false, message: "User not found" });
    }

    const metadata = await readMetadataWithOwners();
    const ownedFiles = metadata.filter((item) => item.uploadedBy === target);

    for (const file of ownedFiles) {
        const filePath = path.join(UPLOADS_DIR, file.filename);
        try {
            await fsp.unlink(filePath);
        } catch (error) {
            if (error.code !== "ENOENT") {
                return res.status(500).json({ success: false, message: "Could not delete user files" });
            }
        }
    }

    const updated = metadata.filter((item) => item.uploadedBy !== target);
    await writeMetadata(updated);
    await dbRun("DELETE FROM users WHERE username = ?", [target]);

    return res.json({ success: true, message: "User and files deleted" });
});

app.delete("/file/:filename", requireAuth, async (req, res) => {
    const requested = req.params.filename;
    const safeName = path.basename(requested);

    if (requested !== safeName) {
        return res.status(400).json({ success: false, message: "Invalid filename" });
    }

    const metadata = await readMetadataWithOwners();
    const target = metadata.find((item) => item.filename === safeName);
    if (!target) {
        return res.status(404).json({ success: false, message: "File not found" });
    }

    const canDelete = req.auth.role === "admin" || target.uploadedBy === req.auth.username;
    if (!canDelete) {
        return res.status(403).json({ success: false, message: "Not allowed to delete this file" });
    }

    const filePath = path.join(UPLOADS_DIR, safeName);

    try {
        await fsp.unlink(filePath);
    } catch (error) {
        if (error.code !== "ENOENT") {
            return res.status(500).json({ success: false, message: "Could not delete file" });
        }
    }

    const updated = metadata.filter((item) => item.filename !== safeName);
    await writeMetadata(updated);

    return res.json({ success: true, message: "File deleted" });
});

app.get("/media/:filename", requireAuth, async (req, res) => {
    if (req.auth.role === "admin") {
        return res.status(403).json({ success: false, message: "Admin cannot play media" });
    }

    const requested = req.params.filename;
    const safeName = path.basename(requested);
    if (requested !== safeName) {
        return res.status(400).json({ success: false, message: "Invalid filename" });
    }

    const metadata = await readMetadataWithOwners();
    const target = metadata.find((item) => item.filename === safeName);
    if (!target) {
        return res.status(404).json({ success: false, message: "File not found" });
    }

    if (target.uploadedBy !== req.auth.username) {
        return res.status(403).json({ success: false, message: "You can only play your own files" });
    }

    const filePath = path.join(UPLOADS_DIR, safeName);
    return res.sendFile(filePath);
});

// Handles multer and other runtime errors with readable JSON for frontend.
app.use((error, req, res, next) => {
    if (error) {
        return res.status(400).json({ success: false, message: error.message || "Request failed" });
    }
    return next();
});

Promise.all([ensureStorageFiles(), ensureDatabase()])
    .then(() => {
        app.listen(PORT, () => {
            console.log(`Server running at http://localhost:${PORT}`);
        });
    })
    .catch((error) => {
        console.error("Failed to initialize storage:", error);
        process.exit(1);
    });
