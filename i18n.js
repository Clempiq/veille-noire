// Langue de l'interface : français (texte d'origine) ou anglais.
// Le jeu est écrit en français ; en anglais, ce module traduit à l'affichage
// tout le texte de la page (et les attributs title, aria-label, placeholder, alt)
// à partir du dictionnaire i18n-en.js. Le moteur, le serveur et les sauvegardes
// restent en français : rien ne change pour eux.
const KEY = 'veille-noire.lang';
const SUPPORTED = ['fr', 'en'];

function detect() {
  try {
    const q = new URLSearchParams(location.search).get('lang');
    if (SUPPORTED.includes(q)) { localStorage.setItem(KEY, q); return q; }
  } catch {}
  try {
    const saved = localStorage.getItem(KEY);
    if (SUPPORTED.includes(saved)) return saved;
  } catch {}
  const nav = (navigator.languages && navigator.languages[0]) || navigator.language || 'fr';
  return nav.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

export const LANG = typeof document === 'undefined' ? 'fr' : detect();

export function setLang(lang) {
  try { localStorage.setItem(KEY, lang); } catch {}
  const url = new URL(location.href); url.searchParams.delete('lang');
  location.replace(url.toString());
}

// Bouton qui propose l'autre langue (à insérer dans un gabarit HTML).
export function langButton(cls = 'quiet') {
  const other = LANG === 'fr' ? 'en' : 'fr';
  const label = other === 'en' ? 'English' : 'Français';
  return `<button type="button" class="${cls} lang-toggle" data-lang-toggle="${other}" data-no-i18n lang="${other}" title="${label}" aria-label="${label}"><span class="lang-long">${label}</span><span class="lang-short" aria-hidden="true">${other.toUpperCase()}</span></button>`;
}

let exact = null, patterns = [];
const cache = new Map();
const produced = new Set();

// Gabarit anglais : "{}" valeur suivante, "{2}" 3e valeur, "{1?s:}" texte si la valeur n'est pas vide.
function fill(tpl, vals) {
  let cursor = 0;
  return tpl.replace(/\{(#?)(\d*)(~?)(?:\?([^:}]*):([^}]*))?\}/g, (m, hash, n, tilde, yes, no) => {
    if (hash) { // {#2?s:} : pluriel selon le nombre de la 3e valeur
      const num = Number(String(vals[+n] ?? '').replace(/[^\d.-]/g, ''));
      return num !== 1 ? yes : no;
    }
    const i = n === '' ? cursor : +n;
    cursor = i + 1;
    let v = vals[i] ?? '';
    if (tilde) { v = v.replace(/^[sS](?=\s|$|[.,;:—])/, ''); if (/[A-Za-zÀ-ÿ]{2}/.test(v)) v = sub(v, 1); } // marque du pluriel français retirée
    if (yes !== undefined) return v.trim() ? yes : no;
    return v;
  });
}

function compile(dict) {
  exact = new Map();
  for (const v of Object.values(dict)) produced.add(v);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const addPattern = (fr, en) => {
    const parts = fr.split('{}');
    if (parts.join('').replace(/[^A-Za-zÀ-ÿ]/g, '').length < 2) return;
    patterns.push([new RegExp('^' + parts.map(esc).join('([\\s\\S]*?)') + '$'), en, parts.join('').replace(/[^A-Za-zÀ-ÿ]/g, '').length]);
  };
  for (let [fr, en] of Object.entries(dict)) {
    fr = fr.replace(/\s+/g, ' ').trim();
    if (!fr.includes('{}')) { exact.set(fr, en); continue; }
    addPattern(fr, en);
    // Une valeur en début ou fin de texte est souvent une icône ou un élément HTML :
    // on accepte aussi le texte sans elle.
    const lead = /^\{\}\s*/.test(fr) && /^\{0?\}\s*/.test(en);
    const trail = /\s*\{\}$/.test(fr) && /\s*\{\d*\}$/.test(en);
    const variants = [];
    if (lead) variants.push([true, false]);
    if (trail) variants.push([false, true]);
    if (lead && trail) variants.push([true, true]);
    for (const [l, t] of variants) {
      let f = fr, e = en;
      if (l) {
        f = f.replace(/^\{\}\s*/, ''); e = e.replace(/^\{0?\}\s*/, '');
        e = e.replace(/\{(\d+)(\?[^}]*)?\}/g, (m, n, c) => `{${n - 1}${c || ''}}`); // valeurs décalées d'un cran
      }
      if (t) { f = f.replace(/\s*\{\}$/, ''); e = e.replace(/\s*\{\d*\}$/, ''); }
      if (!f) continue;
      if (!f.includes('{}')) { if (!exact.has(f)) exact.set(f, e); } else addPattern(f, e);
    }
  }
  patterns.sort((a, b) => b[2] - a[2]);
}

// Traduit une valeur capturée en gardant ses espaces autour.
function sub(v, depth) {
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(v);
  return m[2] ? m[1] + trCore(m[2].replace(/\s+/g, ' '), depth) + m[3] : v;
}

function trCore(core, depth = 0) {
  if (produced.has(core)) return core; // déjà traduit
  if (cache.has(core)) { const c = cache.get(core); return c === null ? core : c; }
  let out = exact.get(core);
  if (out === undefined) {
    for (const [re, en, weight] of patterns) {
      const r = re.exec(core);
      // Un gabarit avec peu de texte fixe ne doit pas avaler une phrase entière.
      if (r && weight < 10 && r.slice(1).some((v) => v.length > 32)) continue;
      if (r) { out = fill(en, r.slice(1).map((v) => (depth < 3 && /[A-Za-zÀ-ÿ]{2}/.test(v) ? sub(v, depth + 1) : v))); break; }
    }
  }
  // Textes composés : « 2 Noyés · 1 Cloche », « 03 / ARSENAL »…
  if (out === undefined && depth < 2) {
    for (const sep of [' — ', ' · ', ' / ', ' : ']) {
      if (!core.includes(sep)) continue;
      const parts = core.split(sep), tp = parts.map((x) => trCore(x.trim(), depth + 1));
      const ok = tp.every((x, i) => x !== parts[i].trim() || !/[a-zà-ÿ]{3}/i.test(x) || /^[A-ZÀ-Ý][a-zà-ÿ]+( [A-ZÀ-Ý][a-zà-ÿ]+)?$/.test(x) || produced.has(x));
      if (ok && tp.some((x, i) => x !== parts[i].trim())) { out = tp.join(sep === ' : ' ? ': ' : sep); break; }
    }
    if (out === undefined) {
      const x = /^(.+?)( ×\d+)$/.exec(core);
      if (x) { const t = trCore(x[1], depth + 1); if (t !== x[1]) out = t + x[2]; }
    }
    if (out === undefined) {
      const n = /^([+−-]?\d+[%+]?)\s+(.+)$/.exec(core);
      if (n) { const t = trCore(n[2], depth + 1); if (t !== n[2]) out = n[1] + ' ' + t; }
    }
  }
  cache.set(core, out === undefined ? null : out);
  if (out !== undefined) produced.add(out);
  return out === undefined ? core : out;
}

export function tr(text) {
  if (!exact || text == null) return text;
  const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(text);
  const core = m[2].replace(/\s+/g, ' ');
  if (!core || !/[A-Za-zÀ-ÿ]/.test(core)) return text;
  const out = trCore(core);
  return out === core ? text : m[1] + out + m[3];
}

const ATTRS = ['title', 'aria-label', 'placeholder', 'alt'];
const SKIP = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'CODE']);
const missed = new Set();

function translateNode(node) {
  if (node.nodeType === 3) {
    const p = node.parentElement;
    if (!p || SKIP.has(p.tagName) || p.closest('[data-no-i18n]')) return;
    const t = tr(node.data);
    if (t !== node.data) node.data = t;
    else if (/[A-Za-zÀ-ÿ]{3}/.test(node.data) && !produced.has(node.data.trim().replace(/\s+/g, ' '))) missed.add(node.data.trim().replace(/\s+/g, ' '));
    return;
  }
  if (node.nodeType !== 1 || SKIP.has(node.tagName) || node.hasAttribute('data-no-i18n')) return;
  for (const a of ATTRS) {
    const v = node.getAttribute(a);
    if (v) { const t = tr(v); if (t !== v) node.setAttribute(a, t); }
  }
  for (const c of node.childNodes) translateNode(c);
}

// Liste des textes affichés restés sans traduction (à appeler depuis la console).
export function missing() { return [...missed].filter((s) => s && tr(s) === s); }

if (LANG !== 'fr' && typeof document !== 'undefined') {
  compile((await import('./i18n-en.js')).default);
  document.documentElement.lang = LANG;
  const run = (root) => translateNode(root);
  run(document.documentElement);
  new MutationObserver((list) => {
    for (const m of list) {
      if (m.type === 'characterData') translateNode(m.target);
      else if (m.type === 'attributes') translateNode(m.target);
      else m.addedNodes.forEach(run);
    }
  }).observe(document.documentElement, { subtree: true, childList: true, characterData: true, attributes: true, attributeFilter: ATTRS });
  window.vnI18n = { tr, missing };
}

if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('[data-lang-toggle]');
    if (b) { e.preventDefault(); setLang(b.getAttribute('data-lang-toggle')); }
  });
}
