const jwt = require("jsonwebtoken");

function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: "Authentification requise" });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || "dev_secret");
    req.user = payload;
    next();
  } catch (err) {
    return res.status(401).json({ error: "Token invalide ou expire" });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Reserve aux administrateurs" });
  }
  next();
}

module.exports = { authRequired, adminOnly };
