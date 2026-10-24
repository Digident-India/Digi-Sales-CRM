/**
 * CSS for the Client Book page (injected with a <style> tag).
 *
 * Used by: pages/ClientsPage.jsx
 */

export const CSS = `
.cb-tools { display:flex; gap:10px; flex-wrap:wrap; align-items:center; margin-bottom:14px; }
.cb-search { position:relative; flex:1 1 280px; min-width:0; }
.cb-search-icon { position:absolute; left:13px; top:50%; transform:translateY(-50%); color:var(--text-dim); pointer-events:none; }
.cb-chips { display:flex; gap:6px; flex-wrap:wrap; }
.cb-chip { padding:7px 13px; border-radius:999px; font-size:12px; font-weight:700; cursor:pointer;
  border:1px solid var(--border-mid); background:var(--bg-card); color:var(--text-muted); font-family:inherit; }
.cb-chip.on { border-color:var(--green-ring); background:var(--green-dim); color:var(--green); }
.cb-sort { width:auto !important; flex:0 0 auto; padding:8px 12px !important; font-size:12px !important; }
.cb-empty { text-align:center; padding:40px; color:var(--text-dim); border:1px dashed var(--border); border-radius:14px; }

.cb-list { background:var(--bg-surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
.cb-row { display:grid; grid-template-columns: minmax(0,2.3fr) minmax(0,1.5fr) minmax(0,1.4fr) minmax(0,1fr) minmax(0,.9fr) 24px;
  gap:14px; align-items:center; padding:12px 16px; }
.cb-head { background:var(--table-head-bg); font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.07em;
  color:var(--text-ghost); border-bottom:1px solid var(--border); }
.cb-item { border-bottom:1px solid var(--table-row-border); cursor:pointer; transition:background .15s; }
.cb-item:last-child { border-bottom:none; }
.cb-item:hover, .cb-item:focus { background:var(--green-dim); outline:none; }
.cb-min { min-width:0; }
.cb-client { display:flex; align-items:center; gap:12px; min-width:0; }
.cb-avatar { width:38px; height:38px; border-radius:50%; flex-shrink:0; display:flex; align-items:center; justify-content:center;
  background:var(--green-dim); color:var(--green); border:1px solid var(--green-ring); font-weight:900; font-size:13px; }
.cb-name { font-size:14px; font-weight:800; color:var(--text-white); display:flex; align-items:center; gap:8px; flex-wrap:wrap; }
.cb-origin { font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; padding:2px 7px; border-radius:999px;
  color:var(--green); background:var(--green-dim); border:1px solid var(--green-ring); }
.cb-origin.direct { color:var(--orange); background:var(--orange-dim); border-color:var(--orange-ring); }
.cb-sub { font-size:11.5px; color:var(--text-dim); margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:inherit; }
.cb-line { display:flex; align-items:center; gap:6px; font-size:12.5px; color:var(--text-muted); overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cb-line + .cb-line { margin-top:3px; }
.cb-dim { color:var(--text-dim); }
.cb-next { color:#d97706; font-size:11px; }
.cb-num { text-align:right; font-size:13px; color:var(--text-muted); white-space:nowrap; }
.cb-num b { color:var(--text-white); }
.cb-due.red { color:var(--red); font-weight:800; }
.cb-label { display:none; }
.cb-head .cb-num { font-size:10px; color:var(--text-ghost); }
.cb-arrow { color:var(--text-ghost); display:flex; justify-content:flex-end; }

@media (max-width: 900px) {
  .cb-head { display:none; }
  .cb-row { grid-template-columns: 1fr 1fr; gap:8px 12px; padding:14px; }
  .cb-client { grid-column: 1 / -1; }
  .cb-arrow { display:none; }
  .cb-num { text-align:left; }
  .cb-label { display:block; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:var(--text-ghost); margin-bottom:2px; }
}
`;
