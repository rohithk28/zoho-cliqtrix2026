// backend/source/services/widgetService.js
import pool from "../config/db.js";

/**
 * Fetch widget config for a user
 */
export async function getWidgetConfig(user_id) {
  const res = await pool.query(
    `SELECT * FROM widget_config WHERE user_id = $1 LIMIT 1`,
    [user_id]
  );
  return res.rows[0] || null;
}

/**
 * Save or update widget config
 */
export async function saveWidgetConfig(user_id, config_json) {
  const res = await pool.query(
    `INSERT INTO widget_config (user_id, config_json)
     VALUES ($1, $2)
     ON CONFLICT (user_id)
     DO UPDATE SET config_json = EXCLUDED.config_json, updated_at = NOW()
     RETURNING *`,
    [user_id, config_json]
  );
  return res.rows[0];
}
