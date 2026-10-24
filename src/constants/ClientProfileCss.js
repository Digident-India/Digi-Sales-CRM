/**
 * CSS for the Client Profile page (injected with a <style> tag).
 *
 * Used by: pages/ClientProfilePage.jsx
 */

export const CSS = `
@keyframes cpspin { to { transform: rotate(360deg); } }
.cp-spin { animation: cpspin 1s linear infinite; }
.cp-dim { color: var(--text-dim); font-size: 12px; }
.cp-muted { color: var(--text-muted); }
.cp-strong { color: var(--text-white); font-weight: 800; }
.cp-red { color: #dc2626; font-weight: 700; }
.cp-small { font-size: 10.5px; }
.cp-mt4 { margin-top: 4px; }
.cp-min { min-width: 0; }
.cp-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cp-link { margin-left: auto; background: none; border: none; color: inherit; text-decoration: underline; cursor: pointer; }
.cp-error { display:flex; gap:8px; align-items:center; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3);
  border-radius:10px; padding:12px 16px; font-size:12px; color:#dc2626; }
.cp-btn { display:inline-flex; align-items:center; gap:6px; padding:8px 12px; border-radius:9px; border:1px solid var(--border-mid);
  background:var(--bg-card); color:var(--text-muted); font-size:12px; font-weight:700; text-decoration:none; cursor:pointer; font-family:inherit; }

.cp-head { display:flex; gap:16px; align-items:center; flex-wrap:wrap; background:var(--bg-surface); border:1px solid var(--border);
  border-radius:14px; padding:18px; margin-bottom:16px; }
.cp-avatar { width:54px; height:54px; border-radius:50%; background:var(--green-dim); color:var(--green); border:1px solid var(--green-ring);
  display:flex; align-items:center; justify-content:center; font-weight:900; font-size:18px; flex-shrink:0; }
.cp-head-main { flex:1 1 260px; min-width:0; }
.cp-title-row { display:flex; gap:8px; align-items:center; flex-wrap:wrap; }
.cp-actions { display:flex; gap:8px; flex-wrap:wrap; }

.cp-cards { display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-bottom:18px; }
.cp-card { background:var(--bg-card); border:1px solid var(--border-dim); border-radius:12px; padding:14px 16px; min-width:0; }
.cp-card-label { font-size:10px; font-weight:700; color:var(--text-ghost); text-transform:uppercase; letter-spacing:.08em; }
.cp-card-value { font-size:20px; font-weight:900; margin-top:6px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.cp-card-note { font-size:11px; color:var(--text-dim); margin-top:2px; }

.cp-tabs { display:flex; gap:4px; border-bottom:1px solid var(--border); margin-bottom:14px; flex-wrap:wrap; }
.cp-tab { background:none; border:none; padding:10px 14px; cursor:pointer; font-size:12px; font-weight:800; letter-spacing:.04em;
  color:var(--text-muted); border-bottom:2px solid transparent; font-family:inherit; }
.cp-tab.on { color:var(--orange); border-bottom-color:var(--orange); }
.cp-pills { display:flex; gap:6px; margin-bottom:12px; flex-wrap:wrap; align-items:center; }
.cp-pill { padding:5px 13px; border-radius:999px; font-size:11px; font-weight:800; cursor:pointer; border:1px solid var(--border-mid);
  background:transparent; color:var(--text-muted); font-family:inherit; }
.cp-pill.on { border-color:var(--orange-ring); background:var(--orange-dim); color:var(--orange); }
.cp-empty { text-align:center; padding:36px; color:var(--text-dim); border:1px dashed var(--border); border-radius:12px; font-size:12px; }

.cp-list { border:1px solid var(--border); border-radius:12px; overflow:hidden; background:var(--bg-surface); }
.cp-inv { display:grid; gap:12px; align-items:center; padding:11px 14px;
  grid-template-columns: minmax(0,1.1fr) minmax(0,1fr) minmax(0,2.2fr) minmax(0,1fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,1.1fr) 18px; }
.cp-inv-head { background:var(--table-head-bg); font-size:10px; font-weight:800; text-transform:uppercase; letter-spacing:.07em;
  color:var(--text-ghost); border-bottom:1px solid var(--border); }
.cp-inv-row { font-size:12.5px; color:var(--text-muted); border-bottom:1px solid var(--table-row-border); cursor:pointer; transition:background .15s; }
.cp-inv-row:last-child { border-bottom:none; }
.cp-inv-row:hover, .cp-inv-row:focus { background:var(--orange-dim); outline:none; }
.cp-invno { font-weight:800; color:#ea580c; font-family:monospace; font-size:13px; }
.cp-r { text-align:right; white-space:nowrap; }
.cp-badge { font-size:10px; font-weight:800; padding:3px 9px; border-radius:999px; white-space:nowrap; }
.cp-arrow { color:var(--text-ghost); display:flex; justify-content:flex-end; }
.cp-lbl { display:none; }

.cp-follow { display:flex; flex-direction:column; gap:14px; }
.cp-section { background:var(--bg-surface); border:1px solid var(--border); border-radius:12px; padding:14px; min-width:0; }
.cp-section-title { font-size:11px; font-weight:800; color:var(--text-ghost); text-transform:uppercase; letter-spacing:.08em; margin-bottom:10px; }
.cp-remarks { display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:8px; }
.cp-remark { background:var(--bg-card); border:1px solid var(--border-dim); border-radius:10px; padding:10px 12px; min-width:0; }

.cp-timeline { border-left:2px solid var(--border); margin-left:8px; padding-left:20px; }
.cp-tl-item { position:relative; padding-bottom:16px; }
.cp-tl-dot { position:absolute; left:-27px; top:3px; width:12px; height:12px; border-radius:50%; border:2px solid var(--bg-base); }

.cp-details { border:1px solid var(--border); border-radius:12px; overflow:hidden; }
.cp-detail-row { display:grid; grid-template-columns: minmax(110px, 180px) minmax(0,1fr); gap:12px; padding:11px 16px;
  border-bottom:1px solid var(--border-dim); font-size:12.5px; }

@media (max-width: 900px) {
  .cp-inv-head { display:none; }
  .cp-inv { grid-template-columns: 1fr 1fr; gap:8px 12px; padding:14px; }
  .cp-invno { grid-column: 1 / -1; }
  .cp-r { text-align:left; }
  .cp-arrow { display:none; }
  .cp-lbl { display:block; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:var(--text-ghost); margin-bottom:2px; }
  .cp-detail-row { grid-template-columns: 1fr; gap:2px; }
}
`;
