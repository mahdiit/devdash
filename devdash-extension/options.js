import { getCfg, setCfg, DEFAULTS, test, originOf, makeT, esc, applyLang } from './common.js';

let cfg, T, tab = 'jira';
const $ = id => document.getElementById(id);
const msg = (s, bad) => { $('msg').textContent = s; $('msg').style.color = bad ? 'var(--err)' : 'var(--ok)'; };

// field defs per tab: [key, label key, input type]
const FIELDS = {
  jira: [['url', 'f_url', 'url'], ['auth', 'f_auth', 'select'], ['username', 'f_user', 'text'], ['token', 'f_token', 'password'], ['api', 'f_api', 'text']],
  gitlab: [['url', 'f_url', 'url'], ['username', 'f_user', 'text'], ['token', 'f_token', 'password']] };

function renderPanel() {
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  const c = cfg[tab], p = $('panel'); p.innerHTML = '';
  for (const [k, lbl, type] of FIELDS[tab]) {
    const row = document.createElement('div'); row.className = 'row';
    row.innerHTML = `<label>${esc(T(lbl))}</label>`;
    const el = document.createElement(type === 'select' ? 'select' : 'input');
    if (type === 'select') { el.className = 'f'; el.innerHTML = `<option value="bearer">${esc(T('bearer'))}</option><option value="basic">${esc(T('basic'))}</option>`; }
    else el.type = type;
    el.value = c[k] ?? ''; el.classList.add('ltr'); el.autocomplete = 'off';
    el.oninput = el.onchange = () => c[k] = el.value.trim();
    row.append(el); p.append(row);
  }
  const h = document.createElement('p'); h.className = 'm'; h.textContent = T(tab === 'gitlab' ? 'hint_gl' : 'hint_jr');
  const qh = document.createElement('h2'); qh.textContent = T('queries'); p.append(qh, h);
  const list = document.createElement('div'); p.append(list);
  const draw = () => {
    list.innerHTML = '';
    c.queries.forEach((qq, idx) => {
      const r = document.createElement('div'); r.className = 'qrow';
      const n = Object.assign(document.createElement('input'), { value: qq.name, placeholder: T('q_name') });
      const q = Object.assign(document.createElement('input'), { value: qq.q, placeholder: T('q_query') }); q.classList.add('ltr');
      n.oninput = () => qq.name = n.value; q.oninput = () => qq.q = q.value;
      const d = Object.assign(document.createElement('button'), { textContent: T('del'), className: 's' });
      d.onclick = () => { c.queries.splice(idx, 1); draw(); };
      r.append(n, q, d); list.append(r);
    });
  };
  draw();
  const add = Object.assign(document.createElement('button'), { textContent: '+ ' + T('add'), className: 's' });
  add.onclick = () => { c.queries.push({ name: '', q: '' }); draw(); }; p.append(add);
}

function clean() { // drop blank queries, normalise url
  for (const k of ['jira', 'gitlab']) { cfg[k].queries = cfg[k].queries.filter(q => q.name.trim() && q.q.trim()); cfg[k].url = cfg[k].url.replace(/\/+$/, ''); }
  cfg.refreshMin = Math.max(1, +$('refreshMin').value || 5);
}
// Must be called straight from a click handler (user gesture) before any await.
const askAccess = (...urls) => { const origins = urls.map(originOf).filter(Boolean); return origins.length ? chrome.permissions.request({ origins }) : true; };

$('save').onclick = async () => {
  clean();
  const granted = await askAccess(cfg.jira.url, cfg.gitlab.url);
  await setCfg(cfg); renderPanel();
  granted ? msg(T('saved')) : msg(T('perm_denied'), 1);
};
$('test').onclick = async () => {
  const c = cfg[tab]; msg('…');
  if (!await askAccess(c.url)) return msg(T('perm_denied'), 1);
  try {
    const who = await test(cfg, tab);
    if (tab === 'gitlab' && !c.username) { c.username = who; renderPanel(); } // fill {user} automatically
    msg(`${T('connected')} ${who}`);
  } catch (e) { msg(e.message, 1); }
};
$('reset').onclick = () => { cfg[tab].queries = structuredClone(DEFAULTS[tab].queries); renderPanel(); };
$('lang').onchange = async e => { cfg.lang = e.target.value; await setCfg(cfg); init(); };
document.querySelectorAll('.tab').forEach(b => b.onclick = () => { tab = b.dataset.tab; renderPanel(); });

async function init() {
  cfg = await getCfg(); T = makeT(cfg.lang); applyLang(cfg.lang);
  $('lang').value = cfg.lang; $('refreshMin').value = cfg.refreshMin; renderPanel();
}
init();
