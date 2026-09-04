# MediStock

Application complete de gestion de stock de produits medicaux : suivi des produits, categories, fournisseurs, mouvements de stock (entrees/sorties/ajustements), et alertes (stock bas, peremption proche, produits perimes).

## Stack technique

- **Backend** : Node.js, Express, SQLite (better-sqlite3), authentification JWT + bcrypt
- **Frontend** : HTML/CSS/JavaScript vanilla (application single-page servie par le backend)

## Fonctionnalites

- Authentification (inscription / connexion), le premier utilisateur cree devient administrateur
- Gestion des produits : creation, edition, suppression, recherche, filtres (stock bas / bientot perime / perime)
- Mouvements de stock : entree, sortie, ajustement, avec historique par produit
- Gestion des categories et des fournisseurs
- Tableau de bord : valeur totale du stock, alertes de stock bas, produits bientot perimes / perimes, derniers mouvements

## Demarrage

```bash
cd server
npm install
cp .env.example .env
npm start
```

L'application est servie sur `http://localhost:4000` (backend + frontend statique).

Au premier demarrage, un compte administrateur est cree automatiquement :
- Email : `admin@medistock.local`
- Mot de passe : `admin123`

Des categories et un fournisseur d'exemple sont egalement crees.

## Structure du projet

```
server/          API Express + base SQLite
  src/
    db/          Connexion SQLite, schema, seed de donnees initiales
    middleware/  Authentification JWT
    routes/      Routes API (auth, produits, categories, fournisseurs, dashboard)
client/          Frontend statique (HTML/CSS/JS)
```

## API principale

| Methode | Route                         | Description                        |
|---------|-------------------------------|------------------------------------|
| POST    | /api/auth/register             | Creer un compte                    |
| POST    | /api/auth/login                | Se connecter                       |
| GET     | /api/products                  | Lister les produits (filtres)      |
| POST    | /api/products                  | Creer un produit                   |
| PUT     | /api/products/:id               | Modifier un produit                |
| DELETE  | /api/products/:id               | Supprimer un produit               |
| POST    | /api/products/:id/movements      | Enregistrer un mouvement de stock  |
| GET     | /api/categories                | Lister les categories              |
| GET     | /api/suppliers                 | Lister les fournisseurs            |
| GET     | /api/dashboard/stats            | Statistiques et alertes            |

Toutes les routes (sauf `/api/auth/*`) necessitent un header `Authorization: Bearer <token>`.
