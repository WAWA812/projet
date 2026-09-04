const API_BASE = "/api";

const state = {
  token: localStorage.getItem("medistock_token") || null,
  user: JSON.parse(localStorage.getItem("medistock_user") || "null"),
  categories: [],
  suppliers: [],
};

// ---------- Helpers ----------
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.className = "toast" + (isError ? " error" : "");
  toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => (toast.hidden = true), 3500);
}

async function api(path, options = {}) {
  const headers = { "Content-Type": "application/json", ...(options.headers || {}) };
  if (state.token) headers.Authorization = `Bearer ${state.token}`;
  const res = await fetch(API_BASE + path, { ...options, headers });
  if (res.status === 401) {
    logout();
    throw new Error("Session expiree, veuillez vous reconnecter");
  }
  const isJson = res.headers.get("content-type")?.includes("application/json");
  const data = isJson ? await res.json() : null;
  if (!res.ok) throw new Error(data?.error || "Une erreur est survenue");
  return data;
}

function fmtDate(d) {
  if (!d) return "-";
  return new Date(d).toLocaleDateString("fr-FR");
}
function fmtDateTime(d) {
  if (!d) return "-";
  return new Date(d).toLocaleString("fr-FR");
}
function fmtMoney(v) {
  return Number(v || 0).toLocaleString("fr-FR", { style: "currency", currency: "EUR" });
}

// ---------- Auth ----------
const loginView = document.getElementById("login-view");
const appView = document.getElementById("app-view");
const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");

document.getElementById("show-register").addEventListener("click", (e) => {
  e.preventDefault();
  loginForm.hidden = true;
  registerForm.hidden = false;
});
document.getElementById("show-login").addEventListener("click", (e) => {
  e.preventDefault();
  registerForm.hidden = true;
  loginForm.hidden = false;
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = document.getElementById("login-email").value;
  const password = document.getElementById("login-password").value;
  const errorEl = document.getElementById("auth-error");
  errorEl.hidden = true;
  try {
    const data = await api("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) });
    setSession(data.token, data.user);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("register-name").value;
  const email = document.getElementById("register-email").value;
  const password = document.getElementById("register-password").value;
  const errorEl = document.getElementById("register-error");
  errorEl.hidden = true;
  try {
    const data = await api("/auth/register", { method: "POST", body: JSON.stringify({ name, email, password }) });
    setSession(data.token, data.user);
  } catch (err) {
    errorEl.textContent = err.message;
    errorEl.hidden = false;
  }
});

document.getElementById("logout-btn").addEventListener("click", logout);

function setSession(token, user) {
  state.token = token;
  state.user = user;
  localStorage.setItem("medistock_token", token);
  localStorage.setItem("medistock_user", JSON.stringify(user));
  boot();
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem("medistock_token");
  localStorage.removeItem("medistock_user");
  appView.hidden = true;
  loginView.hidden = false;
}

// ---------- Navigation ----------
document.querySelectorAll(".nav-link").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".nav-link").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    document.querySelectorAll(".view").forEach((v) => (v.hidden = true));
    document.getElementById("view-" + btn.dataset.view).hidden = false;
    if (btn.dataset.view === "dashboard") loadDashboard();
    if (btn.dataset.view === "products") loadProducts();
    if (btn.dataset.view === "categories") loadCategories();
    if (btn.dataset.view === "suppliers") loadSuppliers();
  });
});

// ---------- Dashboard ----------
async function loadDashboard() {
  try {
    const stats = await api("/dashboard/stats");
    document.getElementById("stat-total").textContent = stats.totalProducts;
    document.getElementById("stat-value").textContent = fmtMoney(stats.totalValue);
    document.getElementById("stat-low").textContent = stats.lowStock;
    document.getElementById("stat-expiring").textContent = stats.expiringSoon;
    document.getElementById("stat-expired").textContent = stats.expired;

    document.getElementById("low-stock-table").innerHTML = stats.lowStockProducts
      .map(
        (p) => `<tr><td>${p.name}</td><td>${p.category_name || "-"}</td>
          <td>${p.quantity} ${p.unit}</td><td>${p.min_threshold}</td></tr>`
      )
      .join("") || `<tr><td colspan="4">Aucune alerte</td></tr>`;

    document.getElementById("expiring-table").innerHTML = stats.expiringProducts
      .map(
        (p) => `<tr><td>${p.name}</td><td>${p.category_name || "-"}</td><td>${fmtDate(p.expiry_date)}</td></tr>`
      )
      .join("") || `<tr><td colspan="3">Aucun produit concerne</td></tr>`;

    document.getElementById("movements-table").innerHTML = stats.recentMovements
      .map(
        (m) => `<tr><td>${fmtDateTime(m.created_at)}</td><td>${m.product_name}</td>
          <td>${movementLabel(m.type)}</td><td>${m.quantity}</td><td>${m.user_name || "-"}</td></tr>`
      )
      .join("") || `<tr><td colspan="5">Aucun mouvement</td></tr>`;
  } catch (err) {
    showToast(err.message, true);
  }
}

function movementLabel(type) {
  return { entree: "Entree", sortie: "Sortie", ajustement: "Ajustement" }[type] || type;
}

// ---------- Categories ----------
async function loadCategories() {
  try {
    state.categories = await api("/categories");
    document.getElementById("categories-table").innerHTML = state.categories
      .map(
        (c) => `<tr><td>${c.name}</td><td>
          <button class="btn danger small" data-delete-category="${c.id}">Supprimer</button></td></tr>`
      )
      .join("") || `<tr><td colspan="2">Aucune categorie</td></tr>`;

    refreshCategorySelects();
  } catch (err) {
    showToast(err.message, true);
  }
}

function refreshCategorySelects() {
  const options = `<option value="">Toutes categories</option>` +
    state.categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
  document.getElementById("filter-category").innerHTML = options;

  document.getElementById("product-category").innerHTML =
    `<option value="">Aucune</option>` + state.categories.map((c) => `<option value="${c.id}">${c.name}</option>`).join("");
}

document.getElementById("category-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = document.getElementById("category-name").value.trim();
  if (!name) return;
  try {
    await api("/categories", { method: "POST", body: JSON.stringify({ name }) });
    document.getElementById("category-name").value = "";
    loadCategories();
    showToast("Categorie ajoutee");
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById("categories-table").addEventListener("click", async (e) => {
  const id = e.target.dataset.deleteCategory;
  if (!id) return;
  if (!confirm("Supprimer cette categorie ?")) return;
  try {
    await api(`/categories/${id}`, { method: "DELETE" });
    loadCategories();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ---------- Suppliers ----------
async function loadSuppliers() {
  try {
    state.suppliers = await api("/suppliers");
    document.getElementById("suppliers-table").innerHTML = state.suppliers
      .map(
        (s) => `<tr><td>${s.name}</td><td>${s.contact_name || "-"}</td><td>${s.phone || "-"}</td>
          <td>${s.email || "-"}</td><td>
          <button class="btn danger small" data-delete-supplier="${s.id}">Supprimer</button></td></tr>`
      )
      .join("") || `<tr><td colspan="5">Aucun fournisseur</td></tr>`;

    document.getElementById("product-supplier").innerHTML =
      `<option value="">Aucun</option>` + state.suppliers.map((s) => `<option value="${s.id}">${s.name}</option>`).join("");
  } catch (err) {
    showToast(err.message, true);
  }
}

document.getElementById("supplier-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const payload = {
    name: document.getElementById("supplier-name").value.trim(),
    contact_name: document.getElementById("supplier-contact").value.trim(),
    phone: document.getElementById("supplier-phone").value.trim(),
    email: document.getElementById("supplier-email").value.trim(),
    address: document.getElementById("supplier-address").value.trim(),
  };
  if (!payload.name) return;
  try {
    await api("/suppliers", { method: "POST", body: JSON.stringify(payload) });
    e.target.reset();
    loadSuppliers();
    showToast("Fournisseur ajoute");
  } catch (err) {
    showToast(err.message, true);
  }
});

document.getElementById("suppliers-table").addEventListener("click", async (e) => {
  const id = e.target.dataset.deleteSupplier;
  if (!id) return;
  if (!confirm("Supprimer ce fournisseur ?")) return;
  try {
    await api(`/suppliers/${id}`, { method: "DELETE" });
    loadSuppliers();
  } catch (err) {
    showToast(err.message, true);
  }
});

// ---------- Products ----------
let productsCache = [];

async function loadProducts() {
  const search = document.getElementById("search-input").value;
  const category_id = document.getElementById("filter-category").value;
  const status = document.getElementById("filter-status").value;
  const params = new URLSearchParams();
  if (search) params.set("search", search);
  if (category_id) params.set("category_id", category_id);
  if (status) params.set("status", status);

  try {
    productsCache = await api("/products?" + params.toString());
    renderProducts();
  } catch (err) {
    showToast(err.message, true);
  }
}

function productStatusBadge(p) {
  const today = new Date().toISOString().slice(0, 10);
  if (p.expiry_date && p.expiry_date < today) return `<span class="badge expired">Perime</span>`;
  if (p.quantity <= p.min_threshold) return `<span class="badge low">Stock bas</span>`;
  return `<span class="badge ok">OK</span>`;
}

function renderProducts() {
  document.getElementById("products-table").innerHTML = productsCache
    .map(
      (p) => `<tr>
        <td>${p.name} ${productStatusBadge(p)}</td>
        <td>${p.sku || "-"}</td>
        <td>${p.category_name || "-"}</td>
        <td>${p.supplier_name || "-"}</td>
        <td>${p.quantity} ${p.unit}</td>
        <td>${p.min_threshold}</td>
        <td>${fmtMoney(p.unit_price)}</td>
        <td>${fmtDate(p.expiry_date)}</td>
        <td class="actions-cell">
          <button class="btn ghost small" data-move="${p.id}" data-name="${p.name}">Mouvement</button>
          <button class="btn ghost small" data-edit="${p.id}">Modifier</button>
          <button class="btn danger small" data-delete="${p.id}">Supprimer</button>
        </td>
      </tr>`
    )
    .join("") || `<tr><td colspan="9">Aucun produit trouve</td></tr>`;
}

document.getElementById("search-input").addEventListener("input", debounce(loadProducts, 300));
document.getElementById("filter-category").addEventListener("change", loadProducts);
document.getElementById("filter-status").addEventListener("change", loadProducts);

function debounce(fn, delay) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), delay);
  };
}

document.getElementById("products-table").addEventListener("click", (e) => {
  const editId = e.target.dataset.edit;
  const deleteId = e.target.dataset.delete;
  const moveId = e.target.dataset.move;

  if (editId) openProductModal(productsCache.find((p) => String(p.id) === editId));
  if (moveId) openMovementModal(moveId, e.target.dataset.name);
  if (deleteId) deleteProduct(deleteId);
});

async function deleteProduct(id) {
  if (!confirm("Supprimer ce produit ?")) return;
  try {
    await api(`/products/${id}`, { method: "DELETE" });
    loadProducts();
    showToast("Produit supprime");
  } catch (err) {
    showToast(err.message, true);
  }
}

// Product modal
const productModal = document.getElementById("product-modal");
document.getElementById("new-product-btn").addEventListener("click", () => openProductModal(null));
document.getElementById("product-cancel").addEventListener("click", () => (productModal.hidden = true));

function openProductModal(product) {
  document.getElementById("product-modal-title").textContent = product ? "Modifier le produit" : "Nouveau produit";
  document.getElementById("product-id").value = product?.id || "";
  document.getElementById("product-name").value = product?.name || "";
  document.getElementById("product-sku").value = product?.sku || "";
  document.getElementById("product-category").value = product?.category_id || "";
  document.getElementById("product-supplier").value = product?.supplier_id || "";
  document.getElementById("product-unit").value = product?.unit || "unite";
  document.getElementById("product-quantity").value = product?.quantity ?? 0;
  document.getElementById("product-quantity").disabled = !!product;
  document.getElementById("product-threshold").value = product?.min_threshold ?? 0;
  document.getElementById("product-price").value = product?.unit_price ?? 0;
  document.getElementById("product-batch").value = product?.batch_number || "";
  document.getElementById("product-expiry").value = product?.expiry_date || "";
  document.getElementById("product-location").value = product?.location || "";
  productModal.hidden = false;
}

document.getElementById("product-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const id = document.getElementById("product-id").value;
  const payload = {
    name: document.getElementById("product-name").value.trim(),
    sku: document.getElementById("product-sku").value.trim() || null,
    category_id: document.getElementById("product-category").value || null,
    supplier_id: document.getElementById("product-supplier").value || null,
    unit: document.getElementById("product-unit").value.trim() || "unite",
    min_threshold: Number(document.getElementById("product-threshold").value),
    unit_price: Number(document.getElementById("product-price").value),
    batch_number: document.getElementById("product-batch").value.trim() || null,
    expiry_date: document.getElementById("product-expiry").value || null,
    location: document.getElementById("product-location").value.trim() || null,
  };
  if (!id) payload.quantity = Number(document.getElementById("product-quantity").value);

  try {
    if (id) await api(`/products/${id}`, { method: "PUT", body: JSON.stringify(payload) });
    else await api("/products", { method: "POST", body: JSON.stringify(payload) });
    productModal.hidden = true;
    loadProducts();
    showToast("Produit enregistre");
  } catch (err) {
    showToast(err.message, true);
  }
});

// Movement modal
const movementModal = document.getElementById("movement-modal");
document.getElementById("movement-cancel").addEventListener("click", () => (movementModal.hidden = true));

function openMovementModal(productId, name) {
  document.getElementById("movement-product-id").value = productId;
  document.getElementById("movement-product-name").textContent = name;
  document.getElementById("movement-type").value = "entree";
  document.getElementById("movement-quantity").value = "";
  document.getElementById("movement-reason").value = "";
  movementModal.hidden = false;
}

document.getElementById("movement-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const productId = document.getElementById("movement-product-id").value;
  const payload = {
    type: document.getElementById("movement-type").value,
    quantity: Number(document.getElementById("movement-quantity").value),
    reason: document.getElementById("movement-reason").value.trim() || null,
  };
  try {
    await api(`/products/${productId}/movements`, { method: "POST", body: JSON.stringify(payload) });
    movementModal.hidden = true;
    loadProducts();
    showToast("Mouvement enregistre");
  } catch (err) {
    showToast(err.message, true);
  }
});

// ---------- Boot ----------
async function boot() {
  if (!state.token) {
    loginView.hidden = false;
    appView.hidden = true;
    return;
  }
  loginView.hidden = true;
  appView.hidden = false;
  document.getElementById("user-name").textContent = `${state.user?.name || ""} (${state.user?.role || ""})`;
  await loadCategories();
  await loadSuppliers();
  await loadDashboard();
}

boot();
