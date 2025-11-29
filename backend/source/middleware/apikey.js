export default function apiKeyMiddleware(req, res, next) {
  const auth = req.headers["authorization"];

  if (!auth || auth !== `Bearer ${process.env.API_KEY}`) {
    return res.status(401).json({ error: "Unauthorized - Invalid API Key" });
  }

  next();
}
