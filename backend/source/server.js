import dotenv from "dotenv";
import { runMigrations } from "./utils/dbSetup.js";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

async function startServer() {
    // 🟩 START SERVER FIRST (does not block boot)
    app.listen(PORT, "0.0.0.0", () => {
        console.log(`🚀 Node backend running on port ${PORT}`);
    });

    // 🟧 RUN MIGRATIONS ONLY IN DEVELOPMENT
    if (process.env.NODE_ENV !== "production") {
        console.log("🛠 Development mode: running migrations.");
        try {
            await runMigrations();
        } catch (err) {
            console.error("Migration failed (development):", err);
        }
    } else {
        console.log("⚠️ Production mode: skipping migrations.");
    }
}

startServer();
