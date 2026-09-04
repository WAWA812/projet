const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();
router.use(authRequired);

router.get("/", (req, res) => {
  res.json(db.prepare("SELECT * FROM categories ORDER BY name").all());
});

router.post("/", (req, res) => {
  const { name } = req.body;
  if (!name) return res.status(400).json({ error: "Nom requis" });
  try {
    const info = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name);
    res.status(201).json({ id: info.lastInsertRowid, name });
  } catch (err) {
    res.status(409).json({ error: "Categorie deja existante" });
  }
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

module.exports = router;
