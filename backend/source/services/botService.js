// backend/source/services/botService.js
import pool from "../config/db.js";

/**
 * log incoming message
 */
export async function logBotMessage({ user_id = null, message }) {
  const res = await pool.query(
    `INSERT INTO bot_logs (user_id, message) VALUES ($1, $2) RETURNING *`,
    [user_id, message]
  );
  return res.rows[0];
}

/**
 * fetch last message by user
 */
export async function getLastMessage(user_id) {
  const res = await pool.query(
    `SELECT message, created_at FROM bot_logs
     WHERE user_id = $1
     ORDER BY created_at DESC LIMIT 1`,
    [user_id]
  );
  return res.rows[0] || null;
}

/**
 * count all messages by user
 */
export async function getMessageCount(user_id) {
  const res = await pool.query(
    `SELECT COUNT(*)::int AS cnt FROM bot_logs WHERE user_id = $1`,
    [user_id]
  );
  return res.rows[0] ? res.rows[0].cnt : 0;
}
