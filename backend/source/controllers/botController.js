// backend/source/controllers/botController.js
import { findUserByCliqId, createUser } from "../services/userService.js";
import { logBotMessage, getLastMessage, getMessageCount } from "../services/botService.js";

/**
 * Expected payload (from Cliq or test):
 * {
 *   message: "hello",
 *   user: { id: "cliq-123", name: "Rohith", email: "x@y.com" }
 * }
 */
export async function handleBotWebhook(req, res) {
  try {
    const { message, user } = req.body || {};
    if (!message || !user || !user.id) {
      return res.status(400).json({ error: "Invalid payload. Require message and user.id" });
    }

    // 1) Ensure user exists (create if missing)
    let dbUser = await findUserByCliqId(user.id);
    if (!dbUser) {
      dbUser = await createUser({
        cliq_user_id: user.id,
        name: user.name || null,
        email: user.email || null,
      });
    }

    // 2) Log the incoming message
    await logBotMessage({ user_id: dbUser.id, message });

    // 3) Build smart response using DB info
    const last = await getLastMessage(dbUser.id);
    const count = await getMessageCount(dbUser.id);

    // last may be the message we just inserted — fetch previous last
    // If you want the prior message (before this one), select offset 1
    const priorRes = await (async () => {
      const { rows } = await (await import("../config/db.js")).default.query(
        `SELECT message FROM bot_logs WHERE user_id = $1 ORDER BY created_at DESC OFFSET 1 LIMIT 1`,
        [dbUser.id]
      );
      return rows[0] ? rows[0].message : null;
    })();

    const responseText = `
    Hello ${dbUser.name || "there"}!
    ${
      priorRes
      ? `Your previous message was: "${priorRes}".`
      : "This looks like your first message with me."
    }
    Total messages you've sent so far: ${count}.
    `.trim();


    return res.json({ text: responseText });
  } catch (err) {
    console.error("bot webhook error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
