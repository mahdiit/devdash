import { getCfg, setCfg, collect, act, I, makeT, esc, applyLang } from './common.js';

let cfg, L, T, D = null, TAB = {}, timer, MF = 'all'; // MF: merged filter for MR tables
const ls = (k, v) => { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch {} };
let PREV = JSON.parse(ls('seen') || 'null'); // urls seen at last visit, fixed for this page session
const $ = id => document.getElementById(id);
const Q = n => I[L].q[n] || n, fmt = n => L === 'fa' ? n.toLocaleString('fa') : n;
const ago = d => { const s = (Date.now() - new Date(d)) / 1000, a = T('ago');
  return s < 3600 ? fmt(Math.round(s / 60)) + ' ' + a[0] : s < 86400 ? fmt(Math.round(s / 3600)) + ' ' + a[1] : fmt(Math.round(s / 86400)) + ' ' + a[2]; };
const isNew = (sys, g, i) => PREV && !(PREV[sys + '/' + g.name] || []).includes(i.url);
function toast(s, bad) { const e = $('toast'); e.textContent = s; e.style.background = bad ? 'var(--err)' : ''; e.style.display = 'block'; setTimeout(() => e.style.display = 'none', bad ? 6000 : 2500); }

function setLang(l) {
  L = l; T = makeT(l); applyLang(l); $('lang').textContent = T('lang');
  if (D) render();
}
async function run(o, btn) {
  if (btn) btn.disabled = true;
  try { await act(cfg, o); toast(T('ok')); load(); } catch (e) { toast(e.message, 1); if (btn) btn.disabled = false; }
}
function comment(o, b) { const text = prompt(T('prompt')); if (text) run({ ...o, action: o.c, text }, b); }
let MENU=null;
const closeMenu=()=>{MENU?.remove();MENU=null};
document.addEventListener('click',closeMenu);document.addEventListener('keydown',e=>e.key==='Escape'&&closeMenu());window.addEventListener('scroll',closeMenu,true);
function openMenu(anchor,entries){ // entries: [[label, fn(fill)]]; fill(entries) swaps the menu content (used for the transition sub-list)
  closeMenu();const m=document.createElement('div');m.className='menu';
  const fill=es=>{m.innerHTML='';for(const [label,fn] of es){const b=document.createElement('button');b.textContent=label;b.onclick=e=>{e.stopPropagation();fn(fill)};m.append(b)}};
  fill(entries);document.body.append(m);MENU=m;
  const r=anchor.getBoundingClientRect(),w=m.offsetWidth,h=m.offsetHeight,rtl=document.documentElement.dir==='rtl';
  m.style.top=Math.max(8,r.bottom+h+8>innerHeight?r.top-h-4:r.bottom+4)+'px';
  m.style.left=Math.min(Math.max(8,rtl?r.right-w:r.left),innerWidth-w-8)+'px'}
const A={
  mr:(i,a)=>[[T('approve'),()=>{closeMenu();confirm(T('confirmApprove'))&&run({action:'gl-approve',pid:i.pid,iid:i.iid},a)}],[T('comment'),()=>{closeMenu();comment({c:'gl-comment',pid:i.pid,iid:i.iid},a)}]],
  todo:(i,a)=>[[T('done'),()=>{closeMenu();run({action:'gl-todo-done',id:i.id},a)}]],
  issue:(i,a)=>[[T('comment'),()=>{closeMenu();comment({c:'jira-comment',key:i.key},a)}],[T('assign'),()=>{closeMenu();run({action:'jira-assign-me',key:i.key},a)}],
    [T('transition'),async fill=>{try{const ts=await act(cfg, {action:'jira-transitions',key:i.key});fill(ts.map(t=>[t.name,()=>{closeMenu();run({action:'jira-transition',key:i.key,id:t.id},a)}]))}catch(e){closeMenu();toast(e.message,1)}}]]};
const link = i => `<a dir="auto" href="${esc(i.url)}" target="_blank">${esc(i.title)}</a><div class="m sm" dir="ltr">${esc(i.project)}</div>`;
const newb = n => n ? `<span class="badge">${T('newb')}</span>` : '';
const COLS = {
  mr: [['c_title', (i, n) => newb(n) + link(i)], ['c_author', i => esc(i.author)],
    ['c_status', i => `<span class="pill">${esc(i.status)}</span> <span class="pill ${i.merged ? 'done' : ''}">${esc(T(i.merged ? 'merged' : 'notmerged'))}</span>`],
    ['c_threads', i => i.open == null ? '' : `<span class="nw"><b class="${i.open ? 'err' : ''}">${fmt(i.open)}</b> ${esc(T('open'))} · <span style="color:var(--ok)">${fmt(i.resolved)}</span> ${esc(T('resolved'))}</span>`]],
  todo: [['c_title', (i, n) => newb(n) + link(i)], ['c_status', i => `<span class="pill">${esc(i.status)}</span>`]],
  issue: [['c_key', i => `<a class="k" href="${esc(i.url)}" target="_blank">${esc(i.key)}</a>`], ['c_summary', (i, n) => newb(n) + `<span dir="auto">${esc(i.title)}</span>`],
    ['c_status', i => `<span class="pill ${esc(i.cat)}">${esc(i.state)}</span>`], ['c_priority', i => esc(i.priority)]] };

const dt=d=>new Date(d).toLocaleString(L==='fa'?'fa-IR':undefined,{dateStyle:'short',timeStyle:'short'});
const when=d=>`${esc(ago(d))}<div class="m sm">${esc(dt(d))}</div>`; // relative text, exact timestamp below
const created=d=>{const ms=Date.now()-new Date(d),n=Math.floor(ms/864e5),h=Math.floor(ms/36e5)%24; // age in days: 2 = yellow, >2 = red
  const span=[n&&fmt(n)+' '+esc(T('days')),(h||!n)&&fmt(h)+' '+esc(T('hours'))].filter(Boolean).join(' ');
  return `<span class="${n>2?'age-bad':n===2?'age-warn':''}">${span}</span><div class="m sm">${esc(dt(d))}</div>`};
function table(sys,g){
  const d=document.createElement('div');
  if(g.error){d.className='err ltr';d.textContent=g.error;return d}
  const items=g.items[0]?.type==='mr'?g.items.filter(i=>MF==='all'||(MF==='merged')===i.merged):g.items;
  if(!items.length){d.className='m';d.textContent=T('none');return d}
  const type=items[0].type,cols=COLS[type],hasCreated=type!=='issue',tbl=document.createElement('table');
  tbl.innerHTML='<tr>'+cols.map(c=>`<th>${esc(T(c[0]))}</th>`).join('')+(hasCreated?`<th>${esc(T('c_created'))}</th>`:'')+`<th>${esc(T('c_updated'))}</th><th>${esc(T('c_actions'))}</th></tr>`;
  for(const i of items){const tr=tbl.insertRow(),n=isNew(sys,g,i);
    tr.innerHTML=cols.map(c=>`<td>${c[1](i,n)}</td>`).join('')+(hasCreated?`<td class="nw">${created(i.created)}</td>`:'')+`<td class="nw">${when(i.updated)}</td><td><button class="s ops" title="${esc(T('c_actions'))}">⋯</button></td>`;
    const b=tr.querySelector('.ops');b.onclick=e=>{e.stopPropagation();openMenu(b,A[i.type](i,b))}}
  return tbl}
function tile(color, html, onclick, cls = '') {
  const b = document.createElement('button'); b.className = 'tile ' + cls; b.style.setProperty('--c', color); b.innerHTML = html;
  if (onclick) b.onclick = onclick; else b.style.cursor = 'default'; $('kpi').append(b); return b;
}
function render() {
  $('kpi').innerHTML = '';
  for (const [sys, v] of Object.entries(D)) for (const g of v.groups) {
    const nw = g.items ? g.items.filter(i => isNew(sys, g, i)).length : 0;
    tile(sys === 'gitlab' ? 'var(--gl)' : 'var(--jr)',
      `<div class="v">${g.error ? '!' : fmt(g.items.length)}</div><div class="l">${esc(Q(g.name))}</div>` + (nw ? `<div class="new">+${fmt(nw)} ${esc(T('newc'))}</div>` : ''),
      () => { TAB[sys] = g.name; render(); $('sec-' + sys).scrollIntoView({ behavior: 'smooth' }); }, g.error ? 'err' : '');
  }
  const mrs = new Map();
  for (const g of D.gitlab?.groups || []) for (const i of g.items || []) if (i.type === 'mr' && i.open != null) mrs.set(i.url, i);
  if (mrs.size) { let o = 0, r = 0; mrs.forEach(i => { o += i.open; r += i.resolved; });
    tile('var(--gl)', `<div class="v"><span class="${o ? 'err' : ''}">${fmt(o)}</span> <span class="m">/ <span style="color:var(--ok)">${fmt(r)}</span></span></div><div class="l">${esc(T('tthreads'))}: ${esc(T('open'))} / ${esc(T('resolved'))}</div>`); }
  const jg = D.jira?.groups[0]?.items;
  if (jg?.length) { const c = {}; jg.forEach(i => c[i.cat] = (c[i.cat] || 0) + 1);
    const col = { new: 'var(--mut)', indeterminate: 'var(--warn)', done: 'var(--ok)' };
    tile('var(--jr)', `<div class="l">${esc(T('jstat'))}</div><div id="bar">` + Object.entries(c).map(([s, n]) => `<span title="${esc(s)}: ${n}" style="flex:${n};background:${col[s] || 'var(--ac)'}"></span>`).join('') +
      '</div><div class="m">' + Object.entries(c).map(([s, n]) => `${esc(s)} ${fmt(n)}`).join(' · ') + '</div>'); }

  const m = $('m'); m.innerHTML = '';
  for (const [sys, v] of Object.entries(D)) {
    const cur = v.groups.find(g => g.name === TAB[sys]) || v.groups[0], s = document.createElement('section'); s.id = 'sec-' + sys;
    s.innerHTML = `<h2>${sys === 'gitlab' ? 'GitLab' : 'Jira'} <a class="m" href="${esc(v.url)}" target="_blank">${esc(v.url)}</a></h2><div class="tabs"></div>`;
    for (const g of v.groups) { const b = document.createElement('button'); b.className = 'tab' + (g === cur ? ' on' : '');
      b.innerHTML = esc(Q(g.name)) + `<span class="n">${g.items ? fmt(g.items.length) : '!'}</span>`; b.onclick = () => { TAB[sys] = g.name; render(); }; s.querySelector('.tabs').append(b); }
    if (cur.items?.[0]?.type === 'mr') { const f = document.createElement('select'); f.className = 's';
      f.innerHTML = ['all', 'merged', 'notmerged'].map(v => `<option value="${v}">${esc(T(v === 'all' ? 'f_all' : v))}</option>`).join('');
      f.value = MF; f.onchange = () => { MF = f.value; render(); }; s.append(f); }
    s.append(table(sys, cur)); m.append(s);
  }
  $('t').textContent = T('updated') + ' ' + new Date().toLocaleTimeString(L === 'fa' ? 'fa' : undefined);
}
async function load() {
  cfg = await getCfg();
  if (!D) $('m').innerHTML = `<p class="m">${esc(T('loading'))}</p>`;
  const rb = $('refresh'); rb.disabled = true; rb.classList.add('busy');
  try {
    D = await collect(cfg);
    if (!Object.keys(D).length) { $('kpi').innerHTML = ''; $('m').innerHTML = `<p class="m">${esc(T('empty'))}</p>`; return; }
    render();
    const seen = {}; for (const [s, v] of Object.entries(D)) for (const g of v.groups) if (g.items) seen[s + '/' + g.name] = g.items.map(i => i.url);
    ls('seen', JSON.stringify(seen)); if (!PREV) PREV = seen; // first ever visit: nothing is "new"
  } catch (e) { $('m').innerHTML = '<p class="err">' + esc(e.message) + '</p>'; }
  finally { rb.disabled = false; rb.classList.remove('busy'); }
}
function schedule() { clearInterval(timer); timer = setInterval(load, Math.max(1, cfg.refreshMin) * 60e3); }

$('lang').onclick = async () => { cfg.lang = L === 'en' ? 'fa' : 'en'; await setCfg(cfg); setLang(cfg.lang); };
$('settings').onclick = () => chrome.runtime.openOptionsPage();
$('refresh').onclick = load;
chrome.storage.onChanged.addListener((ch) => { if (ch.cfg) { D = null; init(); } }); // settings edited in another tab
async function init() { cfg = await getCfg(); setLang(cfg.lang); schedule(); load(); }
init();
