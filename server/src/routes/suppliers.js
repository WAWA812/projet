const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();
router.use(authRequired);

router.get("/", (req, res) => {
  res.json(db.prepare("SELECT * FROM suppliers ORDER BY name").all());
});

router.post("/", (req, res) => {
  const { name, contact_name, phone, email, address } = req.body;
  if (!name) return res.status(400).json({ error: "Nom requis" });
  const info = db
    .prepare(
      "INSERT INTO suppliers (name, contact_name, phone, email, address) VALUES (?, ?, ?, ?, ?)"
    )
    .run(name, contact_name || null, phone || null, email || null, address || null);
  res.status(201).json({ id: info.lastInsertRowid, name, contact_name, phone, email, address });
});

router.put("/:id", (req, res) => {
  const { name, contact_name, phone, email, address } = req.body;
  const existing = db.prepare("SELECT * FROM suppliers WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Fournisseur introuvable" });
  db.prepare(
    "UPDATE suppliers SET name = ?, contact_name = ?, phone = ?, email = ?, address = ? WHERE id = ?"
  ).run(
    name ?? existing.name,
    contact_name ?? existing.contact_name,
    phone ?? existing.phone,
    email ?? existing.email,
    address ?? existing.address,
    req.params.id
  );
  res.json(db.prepare("SELECT * FROM suppliers WHERE id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM suppliers WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

module.exports = router;
