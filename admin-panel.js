// =====================================================
// admin-panel.js — phpMyAdmin-style DB panel
// Mount at /phpmyadmin/ in server.js
// =====================================================

const express = require('express');
const router  = express.Router();

let pool;
function setPool(p) { pool = p; }

const ROWS_PER_PAGE = 25;

function safe(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function sanitizeTable(name) {
  return (name || '').replace(/[^a-zA-Z0-9_]/g, '');
}

async function getTableNames() {
  const [tables] = await pool.query('SHOW TABLES');
  const key = Object.keys(tables[0] || {})[0];
  return tables.map(t => t[key]);
}

async function buildSidebar(activeTable = '') {
  const tables = await getTableNames();
  const counts = await Promise.all(
    tables.map(t => pool.query(`SELECT COUNT(*) AS n FROM \`${t}\``).then(([[r]]) => r.n))
  );
  return {
    sidebarHtml: tables.map((t, i) =>
      `<a href="/phpmyadmin/table/${t}" class="sidebar-link ${t === activeTable ? 'active' : ''}">
         <span class="tbl-icon">▤</span>${safe(t)}
         <span class="count">${counts[i]}</span>
       </a>`
    ).join(''),
    tables,
    counts
  };
}

function shell(title, sidebarHtml, content, breadcrumb = '') {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1.0">
  <title>${safe(title)} — PetVerse Admin</title>
  <style>
    *, *::before, *::after { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; background:#f1f0ff; color:#1a1a2e; display:flex; min-height:100vh; font-size:14px; }

    /* ─── Sidebar ─── */
    .sidebar { width:220px; min-height:100vh; background:#1e1b4b; color:#fff; flex-shrink:0; position:sticky; top:0; height:100vh; overflow-y:auto; display:flex; flex-direction:column; }
    .sb-logo { padding:18px 16px 14px; border-bottom:1px solid rgba(255,255,255,.08); }
    .sb-logo h1 { font-size:17px; font-weight:900; color:#a78bfa; letter-spacing:-.3px; }
    .sb-logo p  { font-size:11px; color:#6b7280; margin-top:2px; }
    .sb-nav { padding:10px 0; border-bottom:1px solid rgba(255,255,255,.07); }
    .sb-nav-link { display:flex; align-items:center; gap:8px; padding:7px 16px; font-size:13px; color:#c4b5fd; text-decoration:none; transition:all .12s; border-left:3px solid transparent; }
    .sb-nav-link:hover, .sb-nav-link.active { background:rgba(167,139,250,.14); color:#fff; border-left-color:#a78bfa; }
    .sb-tables { padding:10px 0; flex:1; }
    .sb-title { font-size:10px; font-weight:700; color:#6b7280; text-transform:uppercase; letter-spacing:1px; padding:0 16px 6px; }
    .sidebar-link { display:flex; align-items:center; gap:6px; padding:6px 16px; font-size:12.5px; color:#c4b5fd; text-decoration:none; transition:all .12s; border-left:3px solid transparent; }
    .sidebar-link:hover, .sidebar-link.active { background:rgba(167,139,250,.14); color:#fff; border-left-color:#a78bfa; }
    .tbl-icon { font-size:11px; opacity:.6; }
    .count { margin-left:auto; background:rgba(255,255,255,.1); padding:1px 7px; border-radius:10px; font-size:10.5px; }

    /* ─── Main ─── */
    .main { flex:1; display:flex; flex-direction:column; min-width:0; }
    .topbar { background:#fff; padding:12px 26px; border-bottom:1px solid #e5e7eb; display:flex; align-items:center; gap:14px; position:sticky; top:0; z-index:10; }
    .topbar h2 { font-size:15px; font-weight:800; }
    .breadcrumb { font-size:12.5px; color:#9ca3af; }
    .breadcrumb a { color:#7c3aed; text-decoration:none; }
    .breadcrumb a:hover { text-decoration:underline; }
    .content { padding:22px 26px; flex:1; }

    /* ─── Cards ─── */
    .card { background:#fff; border-radius:12px; padding:22px 24px; box-shadow:0 1px 6px rgba(0,0,0,.07); margin-bottom:18px; }
    .card-header { display:flex; align-items:center; justify-content:space-between; margin-bottom:16px; }
    .card-title { font-size:15px; font-weight:800; color:#1a1a2e; }
    .card-sub { font-size:12px; color:#9ca3af; margin-left:8px; font-weight:400; }

    /* ─── Table grid ─── */
    .table-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(160px,1fr)); gap:10px; }
    .tg-card { background:#f5f3ff; border:1.5px solid #ede9fe; border-radius:10px; padding:14px; text-decoration:none; color:inherit; transition:all .15s; display:block; }
    .tg-card:hover { border-color:#7c3aed; transform:translateY(-2px); box-shadow:0 4px 14px rgba(124,58,237,.13); }
    .tg-name { font-size:13px; font-weight:800; color:#1a1a2e; margin-bottom:3px; }
    .tg-rows { font-size:12px; color:#7c3aed; font-weight:700; }

    /* ─── Data table ─── */
    .tbl-wrap { overflow-x:auto; }
    table { width:100%; border-collapse:collapse; font-size:12.5px; }
    thead th { background:#f5f3ff; color:#6b21a8; font-weight:700; padding:9px 13px; text-align:left; border-bottom:2px solid #ede9fe; white-space:nowrap; }
    thead th a { color:#6b21a8; text-decoration:none; }
    thead th a:hover { text-decoration:underline; }
    tbody td { padding:8px 13px; border-bottom:1px solid #f3f4f6; color:#374151; max-width:240px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; vertical-align:middle; }
    tbody tr:last-child td { border-bottom:none; }
    tbody tr:hover td { background:#faf8ff; }
    .null-val { color:#9ca3af; font-style:italic; }

    /* ─── Buttons ─── */
    .btn { display:inline-flex; align-items:center; gap:5px; padding:7px 15px; border-radius:8px; border:none; font-size:13px; font-weight:700; cursor:pointer; text-decoration:none; transition:all .13s; font-family:inherit; white-space:nowrap; }
    .btn-primary   { background:#7c3aed; color:#fff; }
    .btn-primary:hover { background:#6d28d9; }
    .btn-success   { background:#10b981; color:#fff; }
    .btn-success:hover { background:#059669; }
    .btn-danger    { background:#ef4444; color:#fff; }
    .btn-danger:hover  { background:#dc2626; }
    .btn-secondary { background:#f3f4f6; color:#374151; }
    .btn-secondary:hover { background:#e5e7eb; }
    .btn-sm { padding:4px 10px; font-size:11.5px; border-radius:6px; }
    .btn-group { display:flex; gap:5px; align-items:center; }

    /* ─── Forms ─── */
    .form-group { margin-bottom:14px; }
    label { display:block; font-size:12.5px; font-weight:700; color:#374151; margin-bottom:4px; }
    .type-badge { font-size:11px; color:#9ca3af; font-weight:400; }
    input[type=text], input[type=number], select, textarea {
      width:100%; padding:9px 13px; border:1.5px solid #e5e7eb; border-radius:8px;
      font-size:13.5px; font-family:inherit; color:#1a1a2e; outline:none; transition:border-color .13s; background:#fff;
    }
    input:focus, select:focus, textarea:focus { border-color:#7c3aed; box-shadow:0 0 0 3px rgba(124,58,237,.07); }
    input[readonly] { background:#f9f8ff; color:#6b7280; cursor:not-allowed; }
    textarea { min-height:80px; resize:vertical; }

    /* ─── Pagination ─── */
    .pagination { display:flex; align-items:center; gap:5px; margin-top:14px; flex-wrap:wrap; }
    .pg-link { padding:5px 11px; border:1.5px solid #e5e7eb; border-radius:6px; font-size:12.5px; font-weight:600; color:#374151; text-decoration:none; transition:all .13s; }
    .pg-link:hover { border-color:#7c3aed; color:#7c3aed; }
    .pg-link.active { background:#7c3aed; border-color:#7c3aed; color:#fff; }
    .pg-link.disabled { opacity:.4; pointer-events:none; }

    /* ─── Alerts ─── */
    .alert { padding:11px 16px; border-radius:9px; font-size:13px; margin-bottom:16px; font-weight:600; }
    .alert-success { background:#d1fae5; color:#065f46; }
    .alert-error   { background:#fee2e2; color:#991b1b; }
    .alert-info    { background:#ede9fe; color:#5b21b6; }

    /* ─── SQL box ─── */
    .sql-area { width:100%; padding:13px; border:1.5px solid #e5e7eb; border-radius:8px; font-family:'Courier New',monospace; font-size:13px; min-height:110px; resize:vertical; outline:none; line-height:1.6; }
    .sql-area:focus { border-color:#7c3aed; }

    /* ─── Stats bar ─── */
    .stat-bar { display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr)); gap:10px; margin-bottom:18px; }
    .stat-item { background:#fff; border-radius:10px; padding:14px 16px; box-shadow:0 1px 5px rgba(0,0,0,.06); text-align:center; }
    .stat-num { font-size:26px; font-weight:900; color:#7c3aed; display:block; line-height:1; margin-bottom:4px; }
    .stat-label { font-size:11px; color:#9ca3af; font-weight:600; text-transform:uppercase; letter-spacing:.5px; }
  </style>
</head>
<body>
  <aside class="sidebar">
    <div class="sb-logo">
      <h1>🐾 PetVerse DB</h1>
      <p>Database Admin Panel</p>
    </div>
    <nav class="sb-nav">
      <a href="/phpmyadmin/" class="sb-nav-link">🏠 Dashboard</a>
      <a href="/phpmyadmin/sql" class="sb-nav-link">⚡ SQL Query</a>
    </nav>
    <div class="sb-tables">
      <div class="sb-title">Tables</div>
      ${sidebarHtml}
    </div>
  </aside>
  <main class="main">
    <div class="topbar">
      <h2>${safe(title)}</h2>
      ${breadcrumb ? `<span class="breadcrumb">${breadcrumb}</span>` : ''}
    </div>
    <div class="content">
      ${content}
    </div>
  </main>
</body>
</html>`;
}

// ─── Dashboard ────────────────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { sidebarHtml, tables, counts } = await buildSidebar();

    const totalRows = counts.reduce((a, b) => a + Number(b), 0);

    const statsBar = `
      <div class="stat-bar">
        <div class="stat-item"><span class="stat-num">${tables.length}</span><span class="stat-label">Tables</span></div>
        <div class="stat-item"><span class="stat-num">${totalRows.toLocaleString()}</span><span class="stat-label">Total Rows</span></div>
      </div>
    `;

    const cards = tables.map((t, i) => `
      <a href="/phpmyadmin/table/${t}" class="tg-card">
        <div class="tg-name">▤ ${safe(t)}</div>
        <div class="tg-rows">${Number(counts[i]).toLocaleString()} rows</div>
      </a>
    `).join('');

    const content = statsBar + `<div class="card">
      <div class="card-header">
        <span class="card-title">All Tables <span class="card-sub">petverse</span></span>
      </div>
      <div class="table-grid">${cards}</div>
    </div>`;

    res.send(shell('Dashboard', sidebarHtml, content));
  } catch (err) {
    res.send(shell('Error', '', `<div class="alert alert-error">Error: ${safe(err.message)}</div>`));
  }
});

// ─── Browse Table ─────────────────────────────────────
router.get('/table/:table', async (req, res) => {
  const table  = sanitizeTable(req.params.table);
  const page   = Math.max(1, parseInt(req.query.page) || 1);
  const sort   = req.query.sort || '';
  const dir    = req.query.dir === 'ASC' ? 'ASC' : 'DESC';
  const msg    = req.query.msg  || '';
  const errMsg = req.query.err  || '';
  const offset = (page - 1) * ROWS_PER_PAGE;

  try {
    const { sidebarHtml } = await buildSidebar(table);
    const [cols] = await pool.query(`DESCRIBE \`${table}\``);
    const pkCol  = (cols.find(c => c.Key === 'PRI') || cols[0])?.Field || 'id';

    const [[{ total }]] = await pool.query(`SELECT COUNT(*) AS total FROM \`${table}\``);
    const totalPages = Math.max(1, Math.ceil(total / ROWS_PER_PAGE));

    const sortCol = cols.find(c => c.Field === sort) ? sort : pkCol;
    const [rows]  = await pool.query(
      `SELECT * FROM \`${table}\` ORDER BY \`${sortCol}\` ${dir} LIMIT ? OFFSET ?`,
      [ROWS_PER_PAGE, offset]
    );

    const thead = cols.map(c => {
      const nextDir = sort === c.Field && dir === 'ASC' ? 'DESC' : 'ASC';
      const arrow   = sort === c.Field ? (dir === 'ASC' ? ' ↑' : ' ↓') : '';
      return `<th><a href="?sort=${encodeURIComponent(c.Field)}&dir=${nextDir}&page=1">${safe(c.Field)}${arrow}</a></th>`;
    }).join('') + '<th style="width:100px;min-width:100px;">Action</th>';

    const tbody = rows.map(row => {
      const pk = row[pkCol];
      const cells = cols.map(c => {
        const v = row[c.Field];
        if (v === null) return `<td><span class="null-val">NULL</span></td>`;
        const s = String(v);
        return `<td title="${safe(s)}">${safe(s.length > 60 ? s.substring(0, 60) + '…' : s)}</td>`;
      }).join('');
      return `<tr>${cells}<td>
        <div class="btn-group">
          <a href="/phpmyadmin/table/${table}/edit/${encodeURIComponent(pk)}" class="btn btn-secondary btn-sm">✏️</a>
          <form method="POST" action="/phpmyadmin/table/${table}/delete/${encodeURIComponent(pk)}" style="margin:0;" onsubmit="return confirm('Delete this row?')">
            <button type="submit" class="btn btn-danger btn-sm">🗑️</button>
          </form>
        </div>
      </td></tr>`;
    }).join('');

    // Pagination
    const makeLink = (p) => `?sort=${encodeURIComponent(sort)}&dir=${dir}&page=${p}`;
    let pag = '';
    if (totalPages > 1) {
      pag = `<div class="pagination">`;
      pag += page > 1 ? `<a href="${makeLink(page-1)}" class="pg-link">← Prev</a>` : `<span class="pg-link disabled">← Prev</span>`;
      for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || Math.abs(i - page) <= 2)
          pag += `<a href="${makeLink(i)}" class="pg-link ${i === page ? 'active' : ''}">${i}</a>`;
        else if (Math.abs(i - page) === 3)
          pag += `<span class="pg-link disabled">…</span>`;
      }
      pag += page < totalPages ? `<a href="${makeLink(page+1)}" class="pg-link">Next →</a>` : `<span class="pg-link disabled">Next →</span>`;
      pag += `</div>`;
    }

    const content = `
      ${msg    ? `<div class="alert alert-success">✓ ${safe(msg)}</div>`   : ''}
      ${errMsg ? `<div class="alert alert-error">✕ ${safe(errMsg)}</div>` : ''}
      <div class="card">
        <div class="card-header">
          <span class="card-title">${safe(table)} <span class="card-sub">${Number(total).toLocaleString()} rows · page ${page} of ${totalPages}</span></span>
          <a href="/phpmyadmin/table/${table}/insert" class="btn btn-primary btn-sm">+ Insert Row</a>
        </div>
        <div class="tbl-wrap">
          <table>
            <thead><tr>${thead}</tr></thead>
            <tbody>${rows.length === 0
              ? `<tr><td colspan="${cols.length + 1}" style="text-align:center;padding:40px;color:#9ca3af;">No records found.</td></tr>`
              : tbody
            }</tbody>
          </table>
        </div>
        ${pag}
      </div>`;

    res.send(shell(`Table: ${table}`, sidebarHtml, content,
      `<a href="/phpmyadmin/">Dashboard</a> / ${safe(table)}`));
  } catch (err) {
    const { sidebarHtml } = await buildSidebar().catch(() => ({ sidebarHtml: '' }));
    res.send(shell('Error', sidebarHtml, `<div class="alert alert-error">Error: ${safe(err.message)}</div>`));
  }
});

// ─── Insert Form ──────────────────────────────────────
router.get('/table/:table/insert', async (req, res) => {
  const table = sanitizeTable(req.params.table);
  const errMsg = req.query.err || '';
  try {
    const { sidebarHtml } = await buildSidebar(table);
    const [cols] = await pool.query(`DESCRIBE \`${table}\``);
    const editableCols = cols.filter(c => c.Extra !== 'auto_increment');

    const fields = editableCols.map(c => {
      const required = c.Null === 'NO' && c.Default === null;
      const isLong   = c.Type.startsWith('text') || c.Type.startsWith('longtext') || c.Type.startsWith('mediumtext');
      const inp = isLong
        ? `<textarea name="${safe(c.Field)}" ${required ? 'required' : ''}></textarea>`
        : `<input type="text" name="${safe(c.Field)}" placeholder="${safe(c.Default ?? '')}" ${required ? 'required' : ''} />`;
      return `<div class="form-group">
        <label>${safe(c.Field)} <span class="type-badge">${safe(c.Type)}${required ? ' · required' : ''}</span></label>
        ${inp}
      </div>`;
    }).join('');

    const content = `
      ${errMsg ? `<div class="alert alert-error">✕ ${safe(errMsg)}</div>` : ''}
      <div class="card">
        <div class="card-header">
          <span class="card-title">Insert into ${safe(table)}</span>
          <a href="/phpmyadmin/table/${table}" class="btn btn-secondary btn-sm">← Back</a>
        </div>
        <form method="POST" action="/phpmyadmin/table/${table}/insert">
          ${fields}
          <button type="submit" class="btn btn-success">✓ Insert Row</button>
        </form>
      </div>`;

    res.send(shell(`Insert: ${table}`, sidebarHtml, content,
      `<a href="/phpmyadmin/">Dashboard</a> / <a href="/phpmyadmin/table/${table}">${safe(table)}</a> / Insert`));
  } catch (err) {
    const { sidebarHtml } = await buildSidebar().catch(() => ({ sidebarHtml: '' }));
    res.send(shell('Error', sidebarHtml, `<div class="alert alert-error">Error: ${safe(err.message)}</div>`));
  }
});

router.post('/table/:table/insert', async (req, res) => {
  const table = sanitizeTable(req.params.table);
  try {
    const [cols] = await pool.query(`DESCRIBE \`${table}\``);
    const editable    = cols.filter(c => c.Extra !== 'auto_increment');
    const colNames    = editable.map(c => `\`${c.Field}\``).join(', ');
    const placeholders = editable.map(() => '?').join(', ');
    const vals        = editable.map(c => {
      const v = req.body[c.Field];
      return (v === undefined || v === '') ? null : v;
    });
    await pool.query(`INSERT INTO \`${table}\` (${colNames}) VALUES (${placeholders})`, vals);
    res.redirect(`/phpmyadmin/table/${table}?msg=Row+inserted+successfully`);
  } catch (err) {
    res.redirect(`/phpmyadmin/table/${table}/insert?err=${encodeURIComponent(err.message)}`);
  }
});

// ─── Edit Form ────────────────────────────────────────
router.get('/table/:table/edit/:rowId', async (req, res) => {
  const table = sanitizeTable(req.params.table);
  const rowId = req.params.rowId;
  const errMsg = req.query.err || '';
  try {
    const { sidebarHtml } = await buildSidebar(table);
    const [cols] = await pool.query(`DESCRIBE \`${table}\``);
    const pkCol  = (cols.find(c => c.Key === 'PRI') || cols[0])?.Field || 'id';
    const [rows] = await pool.query(`SELECT * FROM \`${table}\` WHERE \`${pkCol}\` = ? LIMIT 1`, [rowId]);
    if (rows.length === 0) return res.redirect(`/phpmyadmin/table/${table}?err=Row+not+found`);
    const row = rows[0];

    const fields = cols.map(c => {
      const val   = row[c.Field];
      const valStr = val === null ? '' : String(val);
      const isPK  = c.Key === 'PRI';
      const isLong = c.Type.startsWith('text') || c.Type.startsWith('longtext');
      const inp = isLong
        ? `<textarea name="${safe(c.Field)}" ${isPK ? 'readonly' : ''}>${safe(valStr)}</textarea>`
        : `<input type="text" name="${safe(c.Field)}" value="${safe(valStr)}" ${isPK ? 'readonly' : ''} />`;
      return `<div class="form-group">
        <label>${safe(c.Field)} <span class="type-badge">${safe(c.Type)}${isPK ? ' · primary key' : ''}</span></label>
        ${inp}
      </div>`;
    }).join('');

    const content = `
      ${errMsg ? `<div class="alert alert-error">✕ ${safe(errMsg)}</div>` : ''}
      <div class="card">
        <div class="card-header">
          <span class="card-title">Edit row — ${safe(table)} <span class="card-sub">${safe(pkCol)} = ${safe(rowId)}</span></span>
          <a href="/phpmyadmin/table/${table}" class="btn btn-secondary btn-sm">← Back</a>
        </div>
        <form method="POST" action="/phpmyadmin/table/${table}/edit/${encodeURIComponent(rowId)}">
          ${fields}
          <button type="submit" class="btn btn-primary">💾 Save Changes</button>
        </form>
      </div>`;

    res.send(shell(`Edit: ${table}`, sidebarHtml, content,
      `<a href="/phpmyadmin/">Dashboard</a> / <a href="/phpmyadmin/table/${table}">${safe(table)}</a> / Edit`));
  } catch (err) {
    const { sidebarHtml } = await buildSidebar().catch(() => ({ sidebarHtml: '' }));
    res.send(shell('Error', sidebarHtml, `<div class="alert alert-error">Error: ${safe(err.message)}</div>`));
  }
});

router.post('/table/:table/edit/:rowId', async (req, res) => {
  const table = sanitizeTable(req.params.table);
  const rowId = req.params.rowId;
  try {
    const [cols] = await pool.query(`DESCRIBE \`${table}\``);
    const pkCol  = (cols.find(c => c.Key === 'PRI') || cols[0])?.Field || 'id';
    const updateCols = cols.filter(c => c.Key !== 'PRI');
    const sets  = updateCols.map(c => `\`${c.Field}\` = ?`).join(', ');
    const vals  = updateCols.map(c => {
      const v = req.body[c.Field];
      return (v === undefined || v === '') ? null : v;
    });
    vals.push(rowId);
    await pool.query(`UPDATE \`${table}\` SET ${sets} WHERE \`${pkCol}\` = ?`, vals);
    res.redirect(`/phpmyadmin/table/${table}?msg=Row+updated+successfully`);
  } catch (err) {
    res.redirect(`/phpmyadmin/table/${table}/edit/${encodeURIComponent(rowId)}?err=${encodeURIComponent(err.message)}`);
  }
});

// ─── Delete ───────────────────────────────────────────
router.post('/table/:table/delete/:rowId', async (req, res) => {
  const table = sanitizeTable(req.params.table);
  const rowId = req.params.rowId;
  try {
    const [cols] = await pool.query(`DESCRIBE \`${table}\``);
    const pkCol  = (cols.find(c => c.Key === 'PRI') || cols[0])?.Field || 'id';
    await pool.query(`DELETE FROM \`${table}\` WHERE \`${pkCol}\` = ?`, [rowId]);
    res.redirect(`/phpmyadmin/table/${table}?msg=Row+deleted`);
  } catch (err) {
    res.redirect(`/phpmyadmin/table/${table}?err=${encodeURIComponent(err.message)}`);
  }
});

// ─── SQL Runner ───────────────────────────────────────
router.get('/sql', async (req, res) => {
  try {
    const { sidebarHtml } = await buildSidebar();
    const content = `
      <div class="card">
        <div class="card-title" style="margin-bottom:14px;">⚡ Run SQL Query</div>
        <form method="POST" action="/phpmyadmin/sql">
          <div class="form-group">
            <textarea name="sql" class="sql-area" placeholder="SELECT * FROM members LIMIT 10;&#10;&#10;-- You can run any SQL here.&#10;-- Be careful with UPDATE/DELETE."></textarea>
          </div>
          <button type="submit" class="btn btn-primary">▶ Run Query</button>
        </form>
      </div>`;
    res.send(shell('SQL Query', sidebarHtml, content, `<a href="/phpmyadmin/">Dashboard</a> / SQL`));
  } catch (err) {
    res.send(shell('Error', '', `<div class="alert alert-error">Error: ${safe(err.message)}</div>`));
  }
});

router.post('/sql', async (req, res) => {
  const sql = (req.body.sql || '').trim();
  let { sidebarHtml } = await buildSidebar().catch(() => ({ sidebarHtml: '' }));
  let resultHtml = '';

  try {
    const [rows] = await pool.query(sql);

    if (Array.isArray(rows) && rows.length > 0 && typeof rows[0] === 'object') {
      const colNames = Object.keys(rows[0]);
      const thead = colNames.map(c => `<th>${safe(c)}</th>`).join('');
      const tbody = rows.map(row =>
        `<tr>${colNames.map(c => {
          const v = row[c];
          if (v === null) return `<td><span class="null-val">NULL</span></td>`;
          const s = String(v);
          return `<td title="${safe(s)}">${safe(s.length > 80 ? s.substring(0, 80) + '…' : s)}</td>`;
        }).join('')}</tr>`
      ).join('');
      resultHtml = `
        <div class="alert alert-success">✓ ${rows.length.toLocaleString()} row${rows.length !== 1 ? 's' : ''} returned.</div>
        <div class="tbl-wrap"><table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table></div>`;
    } else if (rows && typeof rows === 'object' && 'affectedRows' in rows) {
      resultHtml = `<div class="alert alert-success">✓ Query OK — ${rows.affectedRows} row${rows.affectedRows !== 1 ? 's' : ''} affected.</div>`;
    } else {
      resultHtml = `<div class="alert alert-success">✓ Query executed successfully.</div>`;
    }
  } catch (err) {
    resultHtml = `<div class="alert alert-error">✕ Error: ${safe(err.message)}</div>`;
  }

  const content = `
    <div class="card">
      <div class="card-title" style="margin-bottom:14px;">⚡ Run SQL Query</div>
      <form method="POST" action="/phpmyadmin/sql">
        <div class="form-group">
          <textarea name="sql" class="sql-area">${safe(sql)}</textarea>
        </div>
        <button type="submit" class="btn btn-primary">▶ Run Query</button>
      </form>
    </div>
    <div class="card">${resultHtml}</div>`;

  res.send(shell('SQL Query', sidebarHtml, content, `<a href="/phpmyadmin/">Dashboard</a> / SQL`));
});

module.exports = { router, setPool };
