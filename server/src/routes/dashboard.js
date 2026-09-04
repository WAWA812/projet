const express = require("express");
const db = require("../db");
const { authRequired } = require("../middleware/auth");

const router = express.Router();
router.use(authRequired);

router.get("/stats", (req, res) => {
  const totalProducts = db.prepare("SELECT COUNT(*) AS c FROM products").get().c;
  const totalValue = db.prepare("SELECT COALESCE(SUM(quantity * unit_price), 0) AS v FROM products").get().v;
  const lowStock = db.prepare("SELECT COUNT(*) AS c FROM products WHERE quantity <= min_threshold").get().c;
  const expiringSoon = db
    .prepare(
      "SELECT COUNT(*) AS c FROM products WHERE expiry_date IS NOT NULL AND date(expiry_date) BETWEEN date('now') AND date('now', '+30 day')"
    )
    .get().c;
  const expired = db
    .prepare("SELECT COUNT(*) AS c FROM products WHERE expiry_date IS NOT NULL AND date(expiry_date) < date('now')")
    .get().c;

  const recentMovements = db
    .prepare(
      `SELECT m.*, p.name AS product_name, u.name AS user_name
       FROM stock_movements m
       JOIN products p ON p.id = m.product_id
       LEFT JOIN users u ON u.id = m.user_id
       ORDER BY m.created_at DESC LIMIT 10`
    )
    .all();

  const lowStockProducts = db
    .prepare(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.quantity <= p.min_threshold ORDER BY p.quantity ASC LIMIT 10`
    )
    .all();

  const expiringProducts = db
    .prepare(
      `SELECT p.*, c.name AS category_name FROM products p
       LEFT JOIN categories c ON c.id = p.category_id
       WHERE p.expiry_date IS NOT NULL AND date(p.expiry_date) <= date('now', '+30 day')
       ORDER BY p.expiry_date ASC LIMIT 10`
    )
    .all();

  res.json({
    totalProducts,
    totalValue,
    lowStock,
    expiringSoon,
    expired,
    recentMovements,
    lowStockProducts,
    expiringProducts,
  });
});

module.exports = router;
