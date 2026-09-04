const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const db = require("../db");

const router = express.Router();

router.post("/register", (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: "Nom, email et mot de passe requis" });
  }
  const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
  if (existing) return res.status(409).json({ error: "Cet email est deja utilise" });

  const hash = bcrypt.hashSync(password, 10);
  const isFirstUser = db.prepare("SELECT COUNT(*) AS c FROM users").get().c === 0;
  const role = isFirstUser ? "admin" : "agent";
  const info = db
    .prepare("INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)")
    .run(name, email, hash, role);

  const user = { id: info.lastInsertRowid, name, email, role };
  const token = jwt.sign(user, process.env.JWT_SECRET || "dev_secret", { expiresIn: "12h" });
  res.status(201).json({ token, user });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Email et mot de passe requis" });
  }
  const row = db.prepare("SELECT * FROM users WHERE email = ?").get(email);
  if (!row || !bcrypt.compareSync(password, row.password_hash)) {
    return res.status(401).json({ error: "Identifiants invalides" });
  }
  const user = { id: row.id, name: row.name, email: row.email, role: row.role };
  const token = jwt.sign(user, process.env.JWT_SECRET || "dev_secret", { expiresIn: "12h" });
  res.json({ token, user });
});

module.exports = router;
