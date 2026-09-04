require("dotenv").config();
const path = require("path");
const express = require("express");
const cors = require("cors");

require("./db");
require("./db/seed");

const authRoutes = require("./routes/auth");
const productRoutes = require("./routes/products");
const categoryRoutes = require("./routes/categories");
const supplierRoutes = require("./routes/suppliers");
const dashboardRoutes = require("./routes/dashboard");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => res.json({ status: "ok" }));
app.use("/api/auth", authRoutes);
app.use("/api/products", productRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/suppliers", supplierRoutes);
app.use("/api/dashboard", dashboardRoutes);

const clientDir = path.resolve(__dirname, "../../client");
app.use(express.static(clientDir));
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(clientDir, "index.html"));
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Erreur interne du serveur" });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`MediStock API demarree sur http://localhost:${PORT}`);
});
