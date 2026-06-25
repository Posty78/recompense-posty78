/**
 * app.js
 * Lit le Google Sheets public en CSV et permet de vérifier un billet.
 */

// ─── Config ────────────────────────────────────────────────────────────────
const SHEET_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vQlADyfV9WVcxtrrgHlpm8pOM94rOL7Xcg2bevTDf54bvuZ_MV8fqTp9KbnAh64w1buNxD5Rm8iLDo_/pub?output=csv";

// ─── DOM ───────────────────────────────────────────────────────────────────
const input       = document.getElementById("billet-input");
const btnVerify   = document.getElementById("btn-verify");
const resultEl    = document.getElementById("result");
const errorEl     = document.getElementById("error");
const loaderEl    = document.getElementById("loader");

// ─── État ──────────────────────────────────────────────────────────────────
let billets = []; // données chargées depuis le sheet

// ─── Chargement du CSV ─────────────────────────────────────────────────────

async function loadSheet() {
  try {
    const res  = await fetch(SHEET_CSV_URL);
    const text = await res.text();
    billets = parseCSV(text);
    console.log(`[app] ${billets.length} billets chargés.`);
  } catch (err) {
    console.error("[app] Erreur chargement sheet :", err);
  }
}

/**
 * Parse un CSV en tableau d'objets.
 * La première ligne est l'en-tête.
 */
function parseCSV(text) {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());

  return lines.slice(1).map((line) => {
    const values = splitCSVLine(line);
    const obj = {};
    headers.forEach((h, i) => {
      obj[h] = (values[i] ?? "").trim().replace(/^"|"$/g, "");
    });
    return obj;
  });
}

/**
 * Split une ligne CSV en respectant les guillemets.
 */
function splitCSVLine(line) {
  const result = [];
  let current  = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  result.push(current);
  return result;
}

// ─── Recherche d'un billet ─────────────────────────────────────────────────

function normalizeNumero(val) {
  const n = parseInt(val, 10);
  if (isNaN(n) || n < 1 || n > 1500) return null;
  return String(n).padStart(4, "0");
}

function findBillet(numero) {
  // Cherche dans toutes les colonnes possibles pour le numéro
  return billets.find((b) => {
    const num = (b["n° billet"] || b["numero"] || b["billet"] || b["n°billet"] || "")
      .trim()
      .padStart(4, "0");
    return num === numero;
  });
}

// ─── Affichage ─────────────────────────────────────────────────────────────

function showLoader() {
  loaderEl.style.display  = "flex";
  resultEl.style.display  = "none";
  errorEl.style.display   = "none";
}

function hideLoader() {
  loaderEl.style.display = "none";
}

function showError(msg) {
  hideLoader();
  errorEl.style.display          = "block";
  resultEl.style.display         = "none";
  document.getElementById("error-message").textContent = msg;
}

function showResult(billet, numero) {
  hideLoader();
  errorEl.style.display  = "none";
  resultEl.style.display = "flex";

  // Numéro
  document.getElementById("result-numero").textContent = `Billet n°${numero}`;

  // Gain — on masque jamais le gain, c'est public
  const gain = billet["gain"] || "—";
  document.getElementById("result-gain").textContent = gain;

  // Statut principal
  const reclame   = (billet["réclamé"] || billet["reclame"] || "").toLowerCase();
  const distribue = (billet["distribué"] || billet["distribue"] || "").toLowerCase();

  let statutLabel = "À distribuer";
  let statutClass = "";

  if (reclame === "oui" || reclame === "true" || reclame === "1") {
    statutLabel = "Réclamé ✓";
    statutClass = "result__statut--reclame";
  } else if (distribue === "oui" || distribue === "true" || distribue === "1") {
    statutLabel = "Distribué";
    statutClass = "result__statut--distribue";
  } else {
    statutLabel = "À distribuer";
    statutClass = "result__statut--libre";
  }

  const statutEl = document.getElementById("result-statut");
  statutEl.textContent = statutLabel;
  statutEl.className   = `result__statut ${statutClass}`;

  document.getElementById("result-statut-detail").textContent = statutLabel;

  // Date
  const date = billet["date"] || "—";
  document.getElementById("result-date").textContent = date || "—";

  // Pseudo — masqué si non réclamé
  const pseudo = billet["réclamé par"] || billet["reclame par"] || "";
  document.getElementById("result-pseudo").textContent =
    pseudo && pseudo !== "" ? pseudo : "—";

  // Code secret — on ne l'affiche JAMAIS même s'il est dans le sheet
  // (colonne ignorée volontairement)
}

// ─── Vérification ──────────────────────────────────────────────────────────

async function verify() {
  const val = input.value.trim();

  if (!val) {
    showError("Entre le numéro de ton billet.");
    return;
  }

  const numero = normalizeNumero(val);

  if (!numero) {
    showError("Numéro invalide. Entre un numéro entre 1 et 1500.");
    return;
  }

  showLoader();

  // Recharge le sheet à chaque vérification pour avoir les données fraîches
  await loadSheet();

  const billet = findBillet(numero);

  if (!billet) {
    showError(`Billet n°${numero} introuvable. Vérifie le numéro inscrit sur ton billet.`);
    return;
  }

  showResult(billet, numero);
}

// ─── Events ────────────────────────────────────────────────────────────────

btnVerify.addEventListener("click", verify);

input.addEventListener("keydown", (e) => {
  if (e.key === "Enter") verify();
});

// ─── Init ──────────────────────────────────────────────────────────────────
loadSheet();