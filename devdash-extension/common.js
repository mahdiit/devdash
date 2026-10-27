// Shared by dashboard + options: config storage, i18n, GitLab/Jira API.
export const DEFAULTS = {
  lang: 'en', refreshMin: 5,
  gitlab: { url: '', token: '', username: '', queries: [
    { name: 'Review requested from me', q: '/api/v4/merge_requests?scope=all&state=opened&reviewer_username={user}' },
    { name: 'My open MRs', q: '/api/v4/merge_requests?scope=all&state=opened&author_username={user}' },
    { name: 'Updated in last 24h (mine)', q: '/api/v4/merge_requests?scope=all&author_username={user}&updated_after={since24h}' },
    { name: 'Pending todos', q: '/api/v4/todos?state=pending' }] },
  jira: { url: '', auth: 'bearer', username: '', token: '', api: '/rest/api/2', queries: [
    { name: 'Assigned to me (open)', q: 'assignee = currentUser() AND resolution = Unresolved ORDER BY priority DESC, updated DESC' },
    { name: 'Changed in last 24h', q: '(assignee = currentUser() OR reporter = currentUser() OR watcher = currentUser()) AND updated >= -1d ORDER BY updated DESC' },
    { name: 'Reported by me (open)', q: 'reporter = currentUser() AND resolution = Unresolved ORDER BY updated DESC' }] },
};
export async function getCfg() {
  const { cfg } = await chrome.storage.local.get('cfg');
  return { ...structuredClone(DEFAULTS), ...cfg };
}
export const setCfg = cfg => chrome.storage.local.set({ cfg });
export const originOf = url => { try { const u = new URL(url); return `${u.protocol}//${u.hostname}/*`; } catch { return null; } };

// ---------- i18n ----------
export const I = {
  en: { title: 'Daily Dev Dashboard', refresh: 'Refresh', loading: 'Loading…', updated: 'Updated', none: 'nothing 🎉',
    approve: 'Approve', comment: 'Comment', done: 'Mark done', assign: 'Assign to me', transition: 'Transition…',
    prompt: 'Comment text:', ok: 'Done', confirmApprove: 'Approve this merge request?', ago: ['m ago', 'h ago', 'd ago'], lang: 'فارسی',
    newc: 'new', newb: 'NEW', jstat: 'Jira status mix', c_title: 'Title', c_project: 'Project', c_author: 'Author', c_status: 'Status',
    c_updated: 'Updated', c_summary: 'Summary', c_priority: 'Priority', c_actions: 'Actions', c_created: 'Created', today: 'today', days: 'days', hours: 'hours', merged: 'Merged', notmerged: 'Not merged', f_all: 'All', c_key: 'Key', c_threads: 'Review threads',
    open: 'open', resolved: 'resolved', tthreads: 'Review threads (all MRs)', settings: 'Settings', empty: 'Nothing configured yet.',
    // options
    s_title: 'Dashboard settings', tab_jira: 'Jira', tab_gitlab: 'GitLab', f_url: 'Server URL', f_token: 'Access token', f_user: 'Username',
    f_auth: 'Auth type', f_api: 'API path', queries: 'Queries', q_name: 'Name', q_query: 'Query', add: 'Add query', del: 'Delete',
    test: 'Test connection', save: 'Save', saved: 'Saved', lang_l: 'Language', refresh_l: 'Auto-refresh (minutes)', reset: 'Reset queries',
    hint_gl: 'GitLab API path. Placeholders: {user} = your username, {since24h} = 24 hours ago. Token needs the "api" scope for actions.',
    hint_jr: 'JQL query. Bearer = personal access token (Server/DC). Basic = username + password/API token.',
    perm_denied: 'Permission to access this server was denied', connected: 'Connected as', bearer: 'Bearer (personal access token)', basic: 'Basic (username + token)',
    q: {} },
  fa: { title: 'داشبورد روزانه توسعه', refresh: 'بازخوانی', loading: 'در حال بارگذاری…', updated: 'به‌روزرسانی', none: 'موردی نیست 🎉',
    approve: 'تأیید', comment: 'نظر', done: 'انجام شد', assign: 'واگذاری به من', transition: 'تغییر وضعیت…',
    prompt: 'متن نظر:', ok: 'انجام شد', confirmApprove: 'این درخواست ادغام تأیید شود؟', ago: ['دقیقه پیش', 'ساعت پیش', 'روز پیش'], lang: 'English',
    newc: 'جدید', newb: 'جدید', jstat: 'وضعیت تسک‌های جیرا', c_title: 'عنوان', c_project: 'پروژه', c_author: 'نویسنده', c_status: 'وضعیت',
    c_updated: 'به‌روزرسانی', c_summary: 'خلاصه', c_priority: 'اولویت', c_actions: 'عملیات', c_created: 'ایجاد', today: 'امروز', days: 'روز', hours: 'ساعت', merged: 'ادغام‌شده', notmerged: 'ادغام‌نشده', f_all: 'همه', c_key: 'کلید', c_threads: 'نظرات بازبینی',
    open: 'باز', resolved: 'حل‌شده', tthreads: 'نظرات بازبینی (همه MRها)', settings: 'تنظیمات', empty: 'هنوز چیزی تنظیم نشده است.',
    s_title: 'تنظیمات داشبورد', tab_jira: 'جیرا', tab_gitlab: 'گیت‌لب', f_url: 'آدرس سرور', f_token: 'توکن دسترسی', f_user: 'نام کاربری',
    f_auth: 'نوع احراز هویت', f_api: 'مسیر API', queries: 'کوئری‌ها', q_name: 'نام', q_query: 'کوئری', add: 'افزودن کوئری', del: 'حذف',
    test: 'تست اتصال', save: 'ذخیره', saved: 'ذخیره شد', lang_l: 'زبان', refresh_l: 'بازخوانی خودکار (دقیقه)', reset: 'بازنشانی کوئری‌ها',
    hint_gl: 'مسیر API گیت‌لب. جایگزین‌ها: {user} = نام کاربری شما، {since24h} = ۲۴ ساعت پیش. برای عملیات، توکن باید دسترسی «api» داشته باشد.',
    hint_jr: 'کوئری JQL. Bearer = توکن دسترسی شخصی (Server/DC). Basic = نام کاربری + رمز/توکن.',
    perm_denied: 'اجازه دسترسی به این سرور داده نشد', connected: 'متصل به عنوان', bearer: 'Bearer (توکن دسترسی شخصی)', basic: 'Basic (نام کاربری + توکن)',
    q: { 'Review requested from me': 'درخواست بررسی از من', 'My open MRs': 'MRهای باز من', 'Updated in last 24h (mine)': 'به‌روزشده در ۲۴ ساعت گذشته (من)',
      'Pending todos': 'کارهای در انتظار', 'Assigned to me (open)': 'واگذارشده به من (باز)', 'Changed in last 24h': 'تغییریافته در ۲۴ ساعت گذشته',
      'Reported by me (open)': 'گزارش‌شده توسط من (باز)' } } };
export const makeT = lang => k => I[lang][k] ?? k;
export const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export function applyLang(lang) {
  document.documentElement.lang = lang; document.documentElement.dir = lang === 'fa' ? 'rtl' : 'ltr';
  const T = makeT(lang);
  document.querySelectorAll('[data-t]').forEach(e => e.textContent = T(e.dataset.t));
}

// ---------- API ----------
const base = u => u.replace(/\/+$/, '');
async function call(method, url, headers, body) {
  let r;
  try {
    r = await fetch(url, { method, credentials: 'omit', signal: AbortSignal.timeout(20000),
      headers: body ? { ...headers, 'Content-Type': 'application/json' } : headers, body: body && JSON.stringify(body) });
  } catch (e) { throw new Error(`Network error (${new URL(url).host}): check URL, HTTPS certificate and site access permission`); }
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${r.statusText} ${t.slice(0, 200)}`);
  return t ? JSON.parse(t) : {};
}
const glH = c => ({ 'PRIVATE-TOKEN': c.gitlab.token });
const jrH = c => ({ 'X-Atlassian-Token': 'no-check', // Jira XSRF guard rejects browser-origin POSTs without it
  Authorization: c.jira.auth === 'basic' ? 'Basic ' + btoa(unescape(encodeURIComponent(`${c.jira.username}:${c.jira.token}`))) : 'Bearer ' + c.jira.token });
const jApi = c => base(c.jira.url) + (c.jira.api || '/rest/api/2');
const settle = (queries, fn) => Promise.all(queries.map(async ({ name, q }) => {
  try { return { name, items: await fn(q) }; } catch (e) { return { name, error: String(e.message || e) }; }
}));

// review threads per MR, cached by MR+updated_at (new notes bump updated_at)
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

export async function collect(c) {
  const out = {}, since24h = new Date(Date.now() - 864e5).toISOString();
  const jobs = [];
  if (c.gitlab.url && c.gitlab.token) jobs.push((async () => {
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
  })());
  if (c.jira.url && c.jira.token) jobs.push((async () => {
    const j = c.jira;
    out.jira = { url: base(j.url), groups: await settle(j.queries, async jql => {
      const r = await call('GET', `${jApi(c)}/search?maxResults=50&fields=summary,status,priority,updated&jql=${encodeURIComponent(jql)}`, jrH(c));
      return r.issues.map(i => ({ type: 'issue', key: i.key, title: i.fields.summary, url: `${base(j.url)}/browse/${i.key}`,
        state: i.fields.status?.name, cat: i.fields.status?.statusCategory?.key, priority: i.fields.priority?.name || '-', updated: i.fields.updated }));
    }) };
  })());
  await Promise.all(jobs);
  return out;
}

export async function act(c, a) {
  const g = base(c.gitlab.url);
  const mr = `${g}/api/v4/projects/${encodeURIComponent(a.pid)}/merge_requests/${encodeURIComponent(a.iid)}`;
  const is = `${jApi(c)}/issue/${encodeURIComponent(a.key)}`;
  switch (a.action) {
    case 'gl-approve': return call('POST', mr + '/approve', glH(c), {});
    case 'gl-comment': return call('POST', mr + '/notes', glH(c), { body: a.text });
    case 'gl-todo-done': return call('POST', `${g}/api/v4/todos/${encodeURIComponent(a.id)}/mark_as_done`, glH(c), {});
    case 'jira-comment': return call('POST', is + '/comment', jrH(c), { body: a.text });
    case 'jira-transitions': return (await call('GET', is + '/transitions', jrH(c))).transitions.map(t => ({ id: t.id, name: t.name }));
    case 'jira-transition': return call('POST', is + '/transitions', jrH(c), { transition: { id: a.id } });
    case 'jira-assign-me': { // Server/DC assigns by name, Cloud by accountId
      const me = await call('GET', jApi(c) + '/myself', jrH(c));
      return call('PUT', is + '/assignee', jrH(c), me.accountId ? { accountId: me.accountId } : { name: me.name });
    }
  }
  throw new Error('unknown action');
}

// Connection test; returns the logged-in username/display name.
export async function test(c, which) {
  if (which === 'gitlab') return (await call('GET', base(c.gitlab.url) + '/api/v4/user', glH(c))).username;
  const me = await call('GET', jApi(c) + '/myself', jrH(c));
  return me.displayName || me.name;
}
