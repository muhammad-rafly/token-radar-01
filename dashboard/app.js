// Token Radar dashboard — renders window.RADAR (written by main.ts) with no network.
//
// Views: the board (#/board, with optional ?category=&chain=&watch=&q=&sort=),
// a protocol's detail view (#/protocol/<slug>), the Live view of protocols
// whose token already trades, and the methodology page. Every row carries its
// farm steps from the same board main.ts writes, so the page and the board
// always agree.

const R = window.RADAR;
const $ = (id) => document.getElementById(id);
const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function money(n) {
  if (n === null || n === undefined) return '—';
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
  return '$' + Math.round(n);
}
function pct(v) {
  if (v === null || v === undefined) return '—';
  return (v > 0 ? '+' : '') + v.toFixed(1) + '%';
}
function age(v) {
  if (v === null || v === undefined) return '—';
  if (v < 30) return v + 'd';
  if (v < 365) return Math.round(v / 30) + 'mo';
  return (v / 365).toFixed(1) + 'y';
}

/* ---- header badges ---- */
$('badges').innerHTML =
  `<span class="badge">Watchlist <b>${R.watchlist_size}/${R.watchlist_size}</b> covered</span>` +
  `<span class="badge"><b>${R.board_size}</b> protocols ranked</span>` +
  `<span class="badge"><b>${R.early_size}</b> early finds below the floor</span>` +
  `<span class="badge">Model <b>${esc(R.model_version)}</b></span>` +
  `<span class="badge">Snapshot <b>${esc(R.as_of)}</b></span>`;

/* ---- filter options ---- */
const cats = [...new Set(R.rows.map((r) => r.category).filter(Boolean))].sort();
const chains = [...new Set(R.rows.flatMap((r) => r.chains))].sort();
for (const c of cats) $('fCategory').insertAdjacentHTML('beforeend', `<option>${esc(c)}</option>`);
for (const c of chains) $('fChain').insertAdjacentHTML('beforeend', `<option>${esc(c)}</option>`);

/* ---- board state ---- */
const state = { q: '', category: '', chain: '', minTvl: 0, watch: false, sort: 'rank', dir: 1 };
const SORTS = {
  rank: (a, b) => a.rank - b.rank,
  implied: (a, b) => b.implied_value_usd - a.implied_value_usd,
  tvl: (a, b) => b.tvl_usd - a.tvl_usd,
  change: (a, b) => (b.change_7d ?? -999) - (a.change_7d ?? -999),
  age: (a, b) => (b.age_days ?? -1) - (a.age_days ?? -1),
  name: (a, b) => (a.name < b.name ? -1 : 1),
};

function filtered() {
  const q = state.q.trim().toLowerCase();
  return R.rows.filter((r) => {
    if (q && !(r.name.toLowerCase().includes(q) || r.slug.includes(q))) return false;
    if (state.category && r.category !== state.category) return false;
    if (state.chain && !r.chains.includes(state.chain)) return false;
    if (r.tvl_usd < state.minTvl) return false;
    if (state.watch && !r.watchlist) return false;
    return true;
  }).sort(SORTS[state.sort]);
}

function renderBoard() {
  const rows = filtered();
  $('count').textContent = `${rows.length} of ${R.rows.length} protocols — click any row for its detail view and farm plan.`;
  $('rows').innerHTML = rows.map((r) => {
    const ch = r.change_7d;
    const cls = ch === null ? '' : ch >= 0 ? 'up' : 'down';
    return `<tr data-slug="${esc(r.slug)}">
      <td>${r.rank}</td>
      <td class="name"><b>${esc(r.name)}${r.watchlist ? '<span class="wl">WATCHLIST</span>' : ''}</b><span>${esc(r.slug)}</span></td>
      <td>${esc(r.category ?? '—')}</td>
      <td>${esc(r.chains.slice(0, 3).join(', '))}${r.chains.length > 3 ? ' +' + (r.chains.length - 3) : ''}</td>
      <td class="num">${money(r.tvl_usd)}</td>
      <td class="num ${cls}">${pct(ch)}</td>
      <td class="num">${age(r.age_days)}</td>
      <td class="num"><b>${money(r.implied_value_usd)}</b></td>
    </tr>`;
  }).join('');
  for (const tr of document.querySelectorAll('#rows tr')) {
    tr.addEventListener('click', () => { location.hash = '#/protocol/' + tr.dataset.slug; });
  }
}

function splitStep(s) {
  const i = s.indexOf(' Cost: ');
  if (i < 0) return { action: s, cost: '', time: '' };
  const action = s.slice(0, i);
  const rest = s.slice(i + 7); // " Cost: " is 7 characters
  const j = rest.indexOf('. Time: ');
  if (j < 0) return { action, cost: rest, time: '' };
  return { action, cost: rest.slice(0, j), time: rest.slice(j + 8).replace(/\.$/, '') };
}

function renderDetail(slug) {
  const r = R.rows.find((x) => x.slug === slug);
  const el = $('detail');
  if (!r) { el.innerHTML = `<p>No protocol with slug ${esc(slug)} on this board.</p>`; return; }
  const base = r.tvl_usd * R.model.base_multiple;
  const steps = r.farm_steps.map((s) => {
    const p = splitStep(s);
    return `<li>${esc(p.action)}<br><b>Cost:</b> ${esc(p.cost)}. <b>Time:</b> ${esc(p.time)}.</li>`;
  }).join('');
  el.innerHTML = `<div class="detail">
    <h2>${esc(r.name)} ${r.watchlist ? '<span class="wl">WATCHLIST</span>' : ''}</h2>
    <p class="lede">${esc(r.slug)} · ${esc(r.category ?? 'No category')} · ${esc(r.chains.join(', '))} · Rank #${r.rank} of ${R.rows.length} · This protocol records no token.</p>
    <div class="stats">
      <div class="stat"><span>Implied value</span><b>${money(r.implied_value_usd)}</b></div>
      <div class="stat"><span>TVL</span><b>${money(r.tvl_usd)}</b></div>
      <div class="stat"><span>7-day change</span><b class="${r.change_7d === null ? '' : r.change_7d >= 0 ? 'up' : 'down'}">${pct(r.change_7d)}</b></div>
      <div class="stat"><span>Age</span><b>${age(r.age_days)}</b></div>
      <div class="stat"><span>Listed</span><b>${esc(r.listed_at ?? '—')}</b></div>
    </div>
    <h3>How the implied value is built</h3>
    <table class="breakdown"><tbody>
      <tr><td>Base — TVL × ${R.model.base_multiple}</td><td class="num">${money(base)}</td></tr>
      <tr><td>Growth × ${r.growth_multiplier.toFixed(4)} (7-day change ${pct(r.change_7d)})</td><td class="num">× ${r.growth_multiplier.toFixed(4)}</td></tr>
      <tr><td>Maturity × ${r.maturity_multiplier.toFixed(4)} (${r.age_days === null ? 'listing date unknown, counted as 365 days' : r.age_days + ' days listed'})</td><td class="num">× ${r.maturity_multiplier.toFixed(4)}</td></tr>
      <tr><td>Precedent × ${r.precedent_multiplier.toFixed(4)} (${(r.precedent_rate * 100).toFixed(0)}% of ${esc(r.category ?? 'all')} protocols in the snapshot already record a token)</td><td class="num">× ${r.precedent_multiplier.toFixed(4)}</td></tr>
      <tr><td>Reach × ${r.reach_multiplier.toFixed(4)} (${r.chains.length} chain${r.chains.length === 1 ? '' : 's'})</td><td class="num">× ${r.reach_multiplier.toFixed(4)}</td></tr>
      <tr><td><b>Implied value</b></td><td class="num"><b>${money(r.implied_value_usd)}</b></td></tr>
    </tbody></table>
    <p class="lede">An implied value is this radar's own claim, never a promise. It does not predict whether or when a token is issued.</p>
    <h3>Farm plan — six steps</h3>
    <ol class="steps">${steps}</ol>
  </div>`;
}

/* ---- live view ---- */
$('liveRows').innerHTML = R.live.map((p) => {
  const ch = p.change_7d;
  return `<tr><td class="name"><b>${esc(p.name)}</b><span>${esc(p.slug)}</span></td>
    <td>${esc(p.category ?? '—')}</td><td>${esc(p.chains.slice(0, 3).join(', '))}</td>
    <td class="num">${money(p.tvl_usd)}</td><td class="num"><b>${money(p.mcap_usd)}</b></td>
    <td class="num ${ch === null ? '' : ch >= 0 ? 'up' : 'down'}">${pct(ch)}</td></tr>`;
}).join('');

/* ---- view switching ---- */
const views = { board: 'boardView', live: 'liveView', method: 'methodView' };
function show(name) {
  for (const [k, id] of Object.entries(views)) $(id).hidden = k !== name;
  document.querySelectorAll('#views button').forEach((b) => b.classList.toggle('active', b.dataset.view === name));
}
for (const b of document.querySelectorAll('#views button')) {
  b.addEventListener('click', () => { location.hash = '#/' + b.dataset.view; });
}

/* ---- controls ---- */
$('q').addEventListener('input', (e) => { state.q = e.target.value; renderBoard(); });
$('fCategory').addEventListener('change', (e) => { state.category = e.target.value; renderBoard(); });
$('fChain').addEventListener('change', (e) => { state.chain = e.target.value; renderBoard(); });
$('fTvl').addEventListener('change', (e) => { state.minTvl = Number(e.target.value); renderBoard(); });
$('fWatch').addEventListener('change', (e) => { state.watch = e.target.checked; renderBoard(); });
$('fSort').addEventListener('change', (e) => { state.sort = e.target.value; renderBoard(); });
document.querySelectorAll('#board thead th').forEach((th) => {
  th.addEventListener('click', () => {
    const k = th.dataset.k;
    if (k === 'rank' || k === 'implied' || k === 'tvl' || k === 'change' || k === 'age' || k === 'name') {
      state.sort = k; $('fSort').value = k; renderBoard();
    }
  });
});

/* ---- routing ---- */
function route() {
  const h = location.hash || '#/board';
  if (h.startsWith('#/protocol/')) {
    show('board');
    $('boardView').hidden = true;
    $('detailView').hidden = false;
    renderDetail(decodeURIComponent(h.slice(11).split('?')[0]));
    window.scrollTo(0, 0);
    return;
  }
  $('detailView').hidden = true;
  const m = h.match(/^#\/(\w+)(?:\?(.*))?$/);
  const name = m && views[m[1]] ? m[1] : 'board';
  if (m && m[2] && name === 'board') {
    const p = new URLSearchParams(m[2]);
    if (p.get('category')) { state.category = p.get('category'); $('fCategory').value = p.get('category'); }
    if (p.get('chain')) { state.chain = p.get('chain'); $('fChain').value = p.get('chain'); }
    if (p.get('watch')) { state.watch = p.get('watch') === '1'; $('fWatch').checked = state.watch; }
    if (p.get('q')) { state.q = p.get('q'); $('q').value = p.get('q'); }
    if (p.get('sort') && SORTS[p.get('sort')]) { state.sort = p.get('sort'); $('fSort').value = p.get('sort'); }
    if (p.get('tvl')) { state.minTvl = Number(p.get('tvl')); $('fTvl').value = p.get('tvl'); }
  }
  show(name);
  renderBoard();
}
window.addEventListener('hashchange', route);
route();
