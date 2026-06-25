/**
 * app.js
 * Lit le Google Sheets public en CSV et permet de vérifier un billet.
 * Affiche aussi le tableau complet des billets.
 */

const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlADyfV9WVcxtrrgHlpm8pOM94rOL7Xcg2bevTDf54bvuZ_MV8fqTp9KbnAh64w1buNxD5Rm8iLDo_/pub?output=csv";

// ─── DOM ───────────────────────────────────────────────────────────────────
const input      = document.getElementById("billet-input");
const btnVerify  = document.getElementById("btn-verify");
const resultEl   = document.getElementById("result");
const errorEl    = document.getElementById("error");
const loaderEl   = document.getElementById("loader");
const tbody      = document.getElementById("billets-tbody");
const tableLoader= document.getElementById("table-loader");
const filterBtns = document.querySelectorAll(".filter-btn");

// ─── État ──────────────────────────────────────────────────────────────────
let billets      = [];
let filtreActif  = "tous";

// ─── CSV Parser ────────────────────────────────────────────────────────────

function splitCSVLine(line) {
  const result = [];
  let current  = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') { inQuotes = !inQuotes; }
    else if (c === "," && !inQuotes) { result.push(current); current = ""; }
    else { current += c; }
  }
  result.push(current);
  return result;
}

function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];
  const headers = lines[0].split(",").map((h) =>
    h.trim().replace(/^"|"$/g, "").toLowerCase()
  );
  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] ?? "").trim().replace(/^"|"$/g, "");
    });
    return obj;
  });
}

// ─── Chargement ────────────────────────────────────────────────────────────

async function loadSheet() {
  try {
    const res  = await fetch(SHEET_CSV_URL + "&t=" + Date.now());
    const text = await res.text();
    billets = parseCSV(text);
    console.log(`[app] ${billets.length} billets chargés.`);
  } catch (err) {
    console.error("[app] Erreur chargement :", err);
  }
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function normalizeNumero(val) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 1 || n > 1500) return null;
  return String(n).padStart(4, "0");
}

function getNumero(b) {
  return (b["n° billet"] || b["numero"] || b["billet"] || b["n°billet"] || b["n°"] || "")
    .trim().padStart(4, "0");
}

function getStatut(b) {
  const reclame   = (b["réclamé"]  || b["reclame"]  || "").toLowerCase();
  const distribue = (b["distribué"] || b["distribue"] || "").toLowerCase();
  if (reclame === "oui" || reclame === "true" || reclame === "1") return "reclame";
  if (distribue === "oui" || distribue === "true" || distribue === "1") return "distribue";
  return "libre";
}

function getStatutLabel(statut) {
  if (statut === "reclame")   return "Réclamé ✓";
  if (statut === "distribue") return "Distribué";
  return "À distribuer";
}

function getGainClass(gain) {
  const n = parseInt((gain || "").replace(/[^0-9]/g, ""), 10);
  if (n >= 500) return "gain--500";
  if (n >= 100) return "gain--100";
  if (n >= 50)  return "gain--50";
  if (n >= 30)  return "gain--30";
  if (n >= 20)  return "gain--20";
  return "gain--10";
}

// ─── Tableau complet ───────────────────────────────────────────────────────

function renderTable(data) {
  if (!tbody) return;

  const filtered = filtreActif === "tous"
    ? data
    : data.filter((b) => getStatut(b) === filtreActif);

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:var(--text-muted); padding:32px;">Aucun billet dans cette catégorie.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((b) => {
    const numero   = getNumero(b);
    const gain     = b["gain"] || "—";
    const statut   = getStatut(b);
    const label    = getStatutLabel(statut);
    const distribue= (b["distribué"] || b["distribue"] || "—");
    const pseudo   = b["réclamé par"] || b["reclame par"] || "—";
    const date     = b["date"] || "—";
    const comment  = b["commentaire"] || "—";

    // Code secret — JAMAIS affiché
    const gainClass   = getGainClass(gain);
    const badgeClass  = `badge badge--${statut}`;

    return `
      <tr>
        <td><strong>${numero}</strong></td>
        <td class="${gainClass}">${gain}</td>
        <td><span class="${badgeClass}">${label}</span></td>
        <td>${distribue}</td>
        <td>${pseudo}</td>
        <td>${date}</td>
        <td style="color:var(--text-muted); font-family:var(--font);">${comment}</td>
      </tr>
    `;
  }).join("");
}

// ─── Filtres ───────────────────────────────────────────────────────────────

filterBtns.forEach((btn) => {
  btn.addEventListener("click", () => {
    filterBtns.forEach((b) => b.classList.remove("is-active"));
    btn.classList.add("is-active");
    filtreActif = btn.dataset.filter;
    renderTable(billets);
  });
});

// ─── Vérification billet ───────────────────────────────────────────────────

function showLoader()  { loaderEl.style.display = "flex"; resultEl.style.display = "none"; errorEl.style.display = "none"; }
function hideLoader()  { loaderEl.style.display = "none"; }

function showError(msg) {
  hideLoader();
  errorEl.style.display = "block";
  resultEl.style.display = "none";
  document.getElementById("error-message").textContent = msg;
}

function showResult(billet, numero) {
  hideLoader();
  errorEl.style.display  = "none";
  resultEl.style.display = "flex";

  document.getElementById("result-numero").textContent = `Billet n°${numero}`;

  const gain   = billet["gain"] || "—";
  document.getElementById("result-gain").textContent = gain;

  const statut = getStatut(billet);
  const label  = getStatutLabel(statut);

  const statutEl = document.getElementById("result-statut");
  statutEl.textContent = label;
  statutEl.className   = `result__statut result__statut--${statut}`;
  document.getElementById("result-statut-detail").textContent = label;

  document.getElementById("result-date").textContent =
    billet["date"] || "—";

  const pseudo = billet["réclamé par"] || billet["reclame par"] || "";
  document.getElementById("result-pseudo").textContent = pseudo || "—";
}

async function verify() {
  const val = input.value.trim();
  if (!val) { showError("Entre le numéro de ton billet."); return; }

  const numero = normalizeNumero(val);
  if (!numero) { showError("Numéro invalide. Entre un numéro entre 1 et 1500."); return; }

  showLoader();
  await loadSheet();
  renderTable(billets);

  const billet = billets.find((b) => getNumero(b) === numero);
  if (!billet) {
    showError(`Billet n°${numero} introuvable. Vérifie le numéro inscrit sur ton billet.`);
    return;
  }
  showResult(billet, numero);
}

// ─── Events ────────────────────────────────────────────────────────────────
btnVerify.addEventListener("click", verify);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") verify(); });

// ─── Init ──────────────────────────────────────────────────────────────────
async function init() {
  await loadSheet();
  if (tableLoader) tableLoader.style.display = "none";
  renderTable(billets);
}

init();