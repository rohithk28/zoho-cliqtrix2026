import fs from "fs";
import path from "path";
import pool from "../config/db.js";
import { fileURLToPath } from "url";

// Fix __dirname for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Correct path: backend/database/migrations
const migrationsDir = path.join(__dirname, "../../database/migrations");

export async function runMigrations() {
    // 🚀 Skip migrations entirely on Render (production)
    if (process.env.NODE_ENV === "production") {
        console.log("⚠️ SKIPPING migrations in production environment.");
        return;
    }

    try {
        console.log("Loading migrations from:", migrationsDir);

        if (!fs.existsSync(migrationsDir)) {
            console.warn("⚠️ Migrations directory not found:", migrationsDir);
            return;
        }

        const files = fs.readdirSync(migrationsDir);

        for (const file of files) {
            if (file.endsWith(".sql")) {
                const filePath = path.join(migrationsDir, file);
                const sql = fs.readFileSync(filePath, "utf-8");

                console.log(`Running migration: ${file}`);
                await pool.query(sql);
            }
        }

        console.log("All migrations executed successfully.");
    } catch (err) {
        console.error("Migration Error:", err);
        // ❌ DO NOT throw — allows backend to continue running
    }
}
