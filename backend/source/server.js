import dotenv from "dotenv";
import { runMigrations } from "./utils/dbSetup.js";
import app from "./app.js";

dotenv.config();

const PORT = process.env.PORT || 5000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 Node backend running on port ${PORT}`);
});

// Run DB migrations
(async () => {
  await runMigrations();
})();
