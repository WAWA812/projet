const bcrypt = require("bcryptjs");
const db = require("./index");

function run() {
  const userCount = db.prepare("SELECT COUNT(*) AS c FROM users").get().c;
  if (userCount === 0) {
    const hash = bcrypt.hashSync("admin123", 10);
    db.prepare(
      "INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)"
    ).run("Administrateur", "admin@medistock.local", hash, "admin");
    console.log("Utilisateur admin cree: admin@medistock.local / admin123");
  }

  const catCount = db.prepare("SELECT COUNT(*) AS c FROM categories").get().c;
  if (catCount === 0) {
    const insert = db.prepare("INSERT INTO categories (name) VALUES (?)");
    ["Medicaments", "Materiel chirurgical", "Consommables", "Equipements", "Vaccins"].forEach(
      (name) => insert.run(name)
    );
    console.log("Categories de base creees");
  }

  const supCount = db.prepare("SELECT COUNT(*) AS c FROM suppliers").get().c;
  if (supCount === 0) {
    db.prepare(
      "INSERT INTO suppliers (name, contact_name, phone, email, address) VALUES (?, ?, ?, ?, ?)"
    ).run("PharmaDistrib", "Jean Dupont", "+33 1 23 45 67 89", "contact@pharmadistrib.fr", "12 rue de la Sante, Paris");
    console.log("Fournisseur de base cree");
  }
}

run();
