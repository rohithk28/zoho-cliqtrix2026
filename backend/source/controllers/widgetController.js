// backend/source/controllers/widgetController.js
import { findUserByCliqId } from "../services/userService.js";
import { getWidgetConfig, saveWidgetConfig } from "../services/widgetService.js";

/**
 * GET /api/widget/config?user_id=cliq-user-1
 */
export async function getConfig(req, res) {
  try {
    const userId = req.query.user_id;
    if (!userId) return res.status(400).json({ error: "user_id required" });

    const user = await findUserByCliqId(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    const config = await getWidgetConfig(user.id);

    return res.json({
      ok: true,
      user: { id: user.id, cliq_user_id: user.cliq_user_id },
      config: config ? config.config_json : {},
    });

  } catch (err) {
    console.error("widget get config:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}

/**
 * POST /api/widget/config
 */
export async function updateConfig(req, res) {
  try {
    const { user_id, config } = req.body;
    if (!user_id || !config)
      return res.status(400).json({ error: "user_id & config required" });

    const user = await findUserByCliqId(user_id);
    if (!user) return res.status(404).json({ error: "User not found" });

    const saved = await saveWidgetConfig(user.id, config);

    return res.json({ ok: true, saved });
  } catch (err) {
    console.error("widget update config:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}
