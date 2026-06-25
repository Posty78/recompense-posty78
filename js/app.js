const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlADyfV9WVcxtrrgHlpm8pOM94rOL7Xcg2bevTDf54bvuZ_MV8fqTp9KbnAh64w1buNxD5Rm8iLDo_/pub?output=csv";

const input       = document.getElementById("billet-input");
const btnVerify   = document.getElementById("btn-verify");
const resultEl    = document.getElementById("result");
const errorEl     = document.getElementById("error");
const loaderEl    = document.getElementById("loader");
const tbody       = document.getElementById("billets-tbody");
const tableLoader = document.getElementById("table-loader");
const filterBtns  = document.querySelectorAll(".filter-btn");

let billets     = [];
let filtreActif = "tous";

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
  // Nettoyer les en-têtes : minuscules + trim
  const headers = lines[0].split(",").map((h) =>
    h.trim().replace(/^"|"$/g, "").toLowerCase().trim()
  );
  console.log("[app] Colonnes détectées :", headers);
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
  // Cherche toutes les variantes possibles du numéro de billet
  const val = (
    b["n° billet"] || b["n°billet"] || b["numero"] ||
    b["billet"] || b["n°"] || b["no billet"] || ""
  ).trim();
  return val.padStart(4, "0");
}

function getStatut(b) {
  // Nettoie et normalise les valeurs avec espaces éventuels
  const reclame   = (b["réclamé"] || b["reclame"] || b["réclamé "] || b["reclame "] || "").toLowerCase().trim();
  const distribue = (b["distribué"] || b["distribue"] || b["distribué "] || b["distribue "] || "").toLowerCase().trim();

  if (reclame === "oui" || reclame === "true" || reclame === "1" || reclame === "x") return "reclame";
  if (distribue === "oui" || distribue === "true" || distribue === "1" || distribue === "x") return "distribue";
  return "libre";
}

function getStatutLabel(statut) {
  if (statut === "reclame")   return "Réclamé ✓";
  if (statut === "distribue") return "Distribué";
  return "À distribuer";
}

function getDate(b) {
  return (
    b["date de réclamation"] || b["date de reclamation"] ||
    b["date réclamation"]    || b["date reclamation"] ||
    b["date"] || "—"
  ).trim() || "—";
}

function getPseudo(b) {
  return (
    b["réclamé par"] || b["reclame par"] ||
    b["réclamé par "] || b["reclame par "] || ""
  ).trim() || "—";
}

function getCommentaire(b) {
  return (b["commentaire"] || "—").trim() || "—";
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

// ─── Tableau ───────────────────────────────────────────────────────────────

function renderTable(data) {
  if (!tbody) return;

  const filtered = filtreActif === "tous"
    ? data
    : data.filter((b) => getStatut(b) === filtreActif);

  if (!filtered.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:32px;">Aucun billet dans cette catégorie.</td></tr>`;
    return;
  }

  tbody.innerHTML = filtered.map((b) => {
    const numero    = getNumero(b);
    const gain      = b["gain"] || "—";
    const statut    = getStatut(b);
    const label     = getStatutLabel(statut);
    const distribue = (b["distribué"] || b["distribue"] || b["distribué "] || "—").trim() || "—";
    const pseudo    = getPseudo(b);
    const date      = getDate(b);
    const comment   = getCommentaire(b);
    const gainClass = getGainClass(gain);

    return `
      <tr>
        <td><strong>${numero}</strong></td>
        <td class="${gainClass}">${gain}</td>
        <td><span class="badge badge--${statut}">${label}</span></td>
        <td>${distribue}</td>
        <td>${pseudo}</td>
        <td>${date}</td>
        <td style="color:var(--text-muted);font-family:var(--font);">${comment}</td>
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

// ─── Vérification ──────────────────────────────────────────────────────────

function showLoader()  {
  loaderEl.style.display = "flex";
  resultEl.style.display = "none";
  errorEl.style.display  = "none";
}

function hideLoader() { loaderEl.style.display = "none"; }

function showError(msg) {
  hideLoader();
  errorEl.style.display  = "block";
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
  document.getElementById("result-date").textContent   = getDate(billet);
  document.getElementById("result-pseudo").textContent = getPseudo(billet);
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