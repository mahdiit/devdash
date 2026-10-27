// Run: node server.js [config.json]  -> http://localhost:<port>
const http = require('http'), fs = require('fs'), path = require('path');
const cfgFile = process.argv[2] || path.join(__dirname, 'config.json');
const load = () => JSON.parse(fs.readFileSync(cfgFile, 'utf8')); // re-read per request: edit config without restart
if (load().verify_ssl === false) process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
const base = u => u.replace(/\/+$/, '');

async function call(method, url, headers, body) {
  const r = await fetch(url, { method, signal: AbortSignal.timeout(20000),
    headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers, body: body && JSON.stringify(body) });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : {};
}
const glH = c => ({ 'PRIVATE-TOKEN': c.gitlab.token });
const jrH = c => ({ Authorization: c.jira.auth === 'basic'
  ? 'Basic ' + Buffer.from(`${c.jira.username}:${c.jira.token}`).toString('base64') : 'Bearer ' + c.jira.token });
const settle = (queries, fn) => Promise.all(Object.entries(queries).map(async ([name, q]) => {
  try { return { name, items: await fn(q) }; } catch (e) { return { name, error: String(e.message || e) }; }
}));

// review threads per MR: {open, resolved}. Cached by MR+updated_at (new notes bump updated_at).
// ponytail: first 100 discussions only, add pagination if an MR ever exceeds that
const threadCache = new Map();
async function threads(c, x) {
  const key = x.id + '@' + x.updated_at;
  if (!threadCache.has(key)) {
    const ds = await call('GET', `${base(c.gitlab.url)}/api/v4/projects/${x.project_id}/merge_requests/${x.iid}/discussions?per_page=100`, glH(c));
    const rs = ds.filter(d => d.notes.some(n => n.resolvable));
    const resolved = rs.filter(d => d.notes.filter(n => n.resolvable).every(n => n.resolved)).length;
    threadCache.set(key, { open: rs.length - resolved, resolved });
  }
  return threadCache.get(key);
}

async function collect() {
  const c = load(), out = {};
  const since24h = new Date(Date.now() - 864e5).toISOString();
  if (c.gitlab) {
    const g = c.gitlab;
    out.gitlab = { url: base(g.url), groups: await settle(g.queries, async q => {
      const p = q.replace('{user}', encodeURIComponent(g.username)).replace('{since24h}', encodeURIComponent(since24h));
      const rows = await call('GET', base(g.url) + p + (p.includes('?') ? '&' : '?') + 'per_page=50', glH(c));
      return Promise.all(rows.map(async x => x.target_url
        ? { type: 'todo', id: x.id, title: x.body, url: x.target_url, project: x.project?.path_with_namespace, status: x.action_name, created: x.created_at, updated: x.updated_at || x.created_at }
        : { type: 'mr', pid: x.project_id, iid: x.iid, title: x.title, url: x.web_url, created: x.created_at, updated: x.updated_at, project: x.references?.full,
            author: x.author?.username, merged: x.state === 'merged', status: (x.draft ? 'draft · ' : '') + (x.detailed_merge_status || x.merge_status),
            ...await threads(c, x).catch(() => ({})) }));
    }) };
  }
  if (c.jira) {
    const j = c.jira, api = base(j.url) + (j.api || '/rest/api/2');
    out.jira = { url: base(j.url), groups: await settle(j.queries, async jql => {
      const r = await call('GET', `${api}/search?maxResults=50&fields=summary,status,priority,updated&jql=${encodeURIComponent(jql)}`, jrH(c));
      return r.issues.map(i => ({ type: 'issue', key: i.key, title: i.fields.summary, url: `${base(j.url)}/browse/${i.key}`,
        state: i.fields.status?.name, cat: i.fields.status?.statusCategory?.key, priority: i.fields.priority?.name || '-', updated: i.fields.updated }));
    }) };
  }
  return out;
}

async function act(a) {
  const c = load(), g = c.gitlab && base(c.gitlab.url), j = c.jira && base(c.jira.url) + (c.jira.api || '/rest/api/2');
  const mr = `${g}/api/v4/projects/${encodeURIComponent(a.pid)}/merge_requests/${encodeURIComponent(a.iid)}`;
  const is = `${j}/issue/${encodeURIComponent(a.key)}`;
  switch (a.action) {
    case 'gl-approve': return call('POST', mr + '/approve', glH(c), {});
    case 'gl-comment': return call('POST', mr + '/notes', glH(c), { body: a.text });
    case 'gl-todo-done': return call('POST', `${g}/api/v4/todos/${encodeURIComponent(a.id)}/mark_as_done`, glH(c), {});
    case 'jira-comment': return call('POST', is + '/comment', jrH(c), { body: a.text });
    case 'jira-transitions': return (await call('GET', is + '/transitions', jrH(c))).transitions.map(t => ({ id: t.id, name: t.name }));
    case 'jira-transition': return call('POST', is + '/transitions', jrH(c), { transition: { id: a.id } });
    case 'jira-assign-me': { // Server/DC assigns by name, Cloud by accountId
      const me = await call('GET', j + '/myself', jrH(c));
      return call('PUT', is + '/assignee', jrH(c), me.accountId ? { accountId: me.accountId } : { name: me.name });
    }
  }
  throw new Error('unknown action');
}

const readBody = req => new Promise(r => { let s = ''; req.on('data', d => s += d); req.on('end', () => r(s)); });
const port = load().port || 8787;
http.createServer(async (req, res) => {
  const json = (code, o) => { res.writeHead(code, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(o)); };
  try {
    if (!/^(localhost|127\.0\.0\.1)(:\d+)?$/.test(req.headers.host || '')) return json(403, { error: 'bad host' }); // anti DNS-rebinding
    if (req.url.startsWith('/api/data')) return json(200, await collect());
    if (req.url === '/api/action') { // custom header forces CORS preflight -> other sites can't POST here (anti CSRF)
      if (req.method !== 'POST' || req.headers['x-dash'] !== '1') return json(403, { error: 'forbidden' });
      return json(200, await act(JSON.parse(await readBody(req))));
    }
    if (req.url === '/fonts/Vazirmatn.woff2') {
      res.writeHead(200, { 'Content-Type': 'font/woff2', 'Cache-Control': 'max-age=86400' });
      return res.end(fs.readFileSync(path.join(__dirname, 'fonts', 'Vazirmatn.woff2')));
    }
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fs.readFileSync(path.join(__dirname, 'index.html')));
  } catch (e) { json(500, { error: String(e.message || e) }); }
}).listen(port, '127.0.0.1', () => console.log('Dashboard: http://localhost:' + port));
