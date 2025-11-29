// backend/source/services/userService.js
import pool from "../config/db.js";

/**
 * find user by cliq_user_id
 */
export async function findUserByCliqId(cliqUserId) {
  const res = await pool.query(
    "SELECT * FROM users WHERE cliq_user_id = $1 LIMIT 1",
    [cliqUserId]
  );
  return res.rows[0] || null;
}

/**
 * create a user record
 */
export async function createUser({ cliq_user_id, name = null, email = null }) {
  const res = await pool.query(
    `INSERT INTO users (cliq_user_id, name, email) 
     VALUES ($1, $2, $3) RETURNING *`,
    [cliq_user_id, name, email]
  );
  return res.rows[0];
}
