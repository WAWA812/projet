const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();
router.use(authRequired);

const productWithJoins = `
  SELECT p.*, c.name AS category_name, s.name AS supplier_name
  FROM products p
  LEFT JOIN categories c ON c.id = p.category_id
  LEFT JOIN suppliers s ON s.id = p.supplier_id
`;

router.get("/", (req, res) => {
  const { search, category_id, status } = req.query;
  let query = productWithJoins + " WHERE 1=1";
  const params = [];

  if (search) {
    query += " AND (p.name LIKE ? OR p.sku LIKE ? OR p.batch_number LIKE ?)";
    const like = `%${search}%`;
    params.push(like, like, like);
  }
  if (category_id) {
    query += " AND p.category_id = ?";
    params.push(category_id);
  }
  if (status === "low") {
    query += " AND p.quantity <= p.min_threshold";
  }
  if (status === "expiring") {
    query += " AND p.expiry_date IS NOT NULL AND date(p.expiry_date) <= date('now', '+30 day')";
  }
  if (status === "expired") {
    query += " AND p.expiry_date IS NOT NULL AND date(p.expiry_date) < date('now')";
  }

  query += " ORDER BY p.name";
  res.json(db.prepare(query).all(...params));
});

router.get("/:id", (req, res) => {
  const product = db.prepare(productWithJoins + " WHERE p.id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ error: "Produit introuvable" });
  const movements = db
    .prepare(
      `SELECT m.*, u.name AS user_name FROM stock_movements m
       LEFT JOIN users u ON u.id = m.user_id
       WHERE m.product_id = ? ORDER BY m.created_at DESC LIMIT 50`
    )
    .all(req.params.id);
  res.json({ ...product, movements });
});

router.post("/", (req, res) => {
  const {
    name, sku, category_id, supplier_id, unit,
    quantity, min_threshold, unit_price, batch_number, expiry_date, location,
  } = req.body;
  if (!name) return res.status(400).json({ error: "Le nom du produit est requis" });

  try {
    const info = db
      .prepare(
        `INSERT INTO products
         (name, sku, category_id, supplier_id, unit, quantity, min_threshold, unit_price, batch_number, expiry_date, location)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        name,
        sku || null,
        category_id || null,
        supplier_id || null,
        unit || "unite",
        quantity || 0,
        min_threshold || 0,
        unit_price || 0,
        batch_number || null,
        expiry_date || null,
        location || null
      );
    const created = db.prepare(productWithJoins + " WHERE p.id = ?").get(info.lastInsertRowid);
    res.status(201).json(created);
  } catch (err) {
    res.status(409).json({ error: "SKU deja utilise" });
  }
});

router.put("/:id", (req, res) => {
  const existing = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!existing) return res.status(404).json({ error: "Produit introuvable" });

  const fields = [
    "name", "sku", "category_id", "supplier_id", "unit",
    "min_threshold", "unit_price", "batch_number", "expiry_date", "location",
  ];
  const updates = {};
  fields.forEach((f) => {
    updates[f] = req.body[f] !== undefined ? req.body[f] : existing[f];
  });

  db.prepare(
    `UPDATE products SET name=?, sku=?, category_id=?, supplier_id=?, unit=?,
     min_threshold=?, unit_price=?, batch_number=?, expiry_date=?, location=?, updated_at=datetime('now')
     WHERE id=?`
  ).run(
    updates.name, updates.sku, updates.category_id, updates.supplier_id, updates.unit,
    updates.min_threshold, updates.unit_price, updates.batch_number, updates.expiry_date,
    updates.location, req.params.id
  );

  res.json(db.prepare(productWithJoins + " WHERE p.id = ?").get(req.params.id));
});

router.delete("/:id", (req, res) => {
  db.prepare("DELETE FROM products WHERE id = ?").run(req.params.id);
  res.status(204).end();
});

// Mouvement de stock (entree / sortie / ajustement)
router.post("/:id/movements", (req, res) => {
  const product = db.prepare("SELECT * FROM products WHERE id = ?").get(req.params.id);
  if (!product) return res.status(404).json({ error: "Produit introuvable" });

  const { type, quantity, reason } = req.body;
  if (!["entree", "sortie", "ajustement"].includes(type)) {
    return res.status(400).json({ error: "Type de mouvement invalide" });
  }
  const qty = Number(quantity);
  if (!Number.isFinite(qty) || qty <= 0) {
    return res.status(400).json({ error: "Quantite invalide" });
  }

  let newQuantity = product.quantity;
  if (type === "entree") newQuantity += qty;
  else if (type === "sortie") newQuantity -= qty;
  else newQuantity = qty;

  if (newQuantity < 0) {
    return res.status(400).json({ error: "Stock insuffisant pour cette sortie" });
  }

  const tx = db.transaction(() => {
    db.prepare("UPDATE products SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(
      newQuantity,
      req.params.id
    );
    db.prepare(
      "INSERT INTO stock_movements (product_id, user_id, type, quantity, reason) VALUES (?, ?, ?, ?, ?)"
    ).run(req.params.id, req.user.id, type, qty, reason || null);
  });
  tx();

  const updated = db.prepare(productWithJoins + " WHERE p.id = ?").get(req.params.id);
  res.status(201).json(updated);
});

module.exports = router;
