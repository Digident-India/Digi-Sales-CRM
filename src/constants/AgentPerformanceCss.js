/**
 * CSS for the Agent Performance page (injected with a <style> tag).
 *
 * Used by: pages/AgentPerformancePage.jsx, pages/AgentPerformanceDetailPage.jsx
 */

export const CSS = `
@keyframes apspin { to { transform: rotate(360deg); } }
.ap-spin { animation: apspin 1s linear infinite; }
.ap { min-width: 0; }
.ap-dim { color: var(--text-dim); font-size: 12px; }
.ap-min { min-width: 0; }
.ap-ellipsis { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ap-strong { color: var(--text-white); font-weight: 700; }
.ap-violet { color: #8b5cf6; }
.ap-amber { color: #d97706; }
.ap-row-wrap { display: flex; gap: 8px; flex-wrap: wrap; }
.ap-link { margin-left: auto; background: none; border: none; color: inherit; text-decoration: underline; cursor: pointer; font-size: 11px; }
.ap-error { display:flex; gap:8px; align-items:center; background:rgba(239,68,68,.1); border:1px solid rgba(239,68,68,.3);
  border-radius:10px; padding:10px 14px; margin-bottom:14px; font-size:12px; color:#dc2626; }
.ap-warn { display:flex; gap:10px; align-items:flex-start; background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.4);
  border-radius:10px; padding:10px 14px; margin-bottom:14px; font-size:12px; color:#b45309; line-height:1.5; }

.ap-period { display:flex; gap:8px; flex-wrap:wrap; align-items:center; margin-bottom:16px; }
.ap-chip { padding:7px 13px; border-radius:999px; font-size:11px; font-weight:800; cursor:pointer; font-family:inherit;
  border:1px solid var(--border-mid); background:var(--bg-card); color:var(--text-muted); }
.ap-chip.on { border-color:rgba(139,92,246,.6); background:rgba(139,92,246,.12); color:#8b5cf6; }
.ap-date { width:auto !important; padding:6px 10px !important; font-size:12px !important; }

.ap-stats { display:grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap:10px; margin-bottom:16px; }
.ap-stat { min-width:0; border-radius:12px; padding:14px 16px; background:var(--bg-card); border:1px solid var(--border-dim); }
.ap-stat.hl { background:rgba(139,92,246,.08); border-color:rgba(139,92,246,.45); }
.ap-stat-label { display:flex; align-items:center; gap:6px; font-size:10px; text-transform:uppercase; letter-spacing:.08em; color:var(--text-ghost); font-weight:700; }
.ap-stat.hl .ap-stat-label { color:#8b5cf6; }
.ap-stat-value { font-size:21px; font-weight:900; margin-top:6px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; }
.ap-stat-sub { font-size:11px; color:var(--text-dim); margin-top:2px; }

.ap-board { background:var(--bg-surface); border:1px solid var(--border); border-radius:14px; overflow:hidden; }
.ap-board-head { display:flex; align-items:center; justify-content:space-between; gap:10px; flex-wrap:wrap; padding:12px 14px; border-bottom:1px solid var(--border); }
.ap-board-title { font-size:12px; font-weight:800; color:var(--text-white); text-transform:uppercase; letter-spacing:.08em; }
.ap-board-title span { color:var(--text-dim); font-weight:600; text-transform:none; letter-spacing:0; }
.ap-check { display:flex; align-items:center; gap:6px; font-size:11px; color:var(--text-dim); cursor:pointer; }

.ap-grid { display:grid; gap:12px; align-items:start; padding:12px 14px;
  grid-template-columns: 28px minmax(0,1.9fr) minmax(0,1.3fr) minmax(0,1.2fr) minmax(0,1.3fr) minmax(0,.9fr) minmax(0,1.2fr) minmax(0,1.2fr) minmax(0,.9fr); }
.ap-grid-head { background:var(--table-head-bg); border-bottom:1px solid var(--border); font-size:10px; font-weight:800;
  text-transform:uppercase; letter-spacing:.06em; color:var(--text-ghost); align-items:center; }
.ap-grid-head .hl { color:#8b5cf6; }
.ap .r { text-align:right; }
.ap-agent { border-bottom:1px solid var(--table-row-border); }
.ap-agent.open { background:var(--bg-base); }
.ap-item { cursor:pointer; font-size:12.5px; color:var(--text-muted); transition:background .15s; }
.ap-item:hover, .ap-item:focus { background:rgba(139,92,246,.05); outline:none; }
.ap-rank { font-weight:900; color:var(--text-dim); padding-top:6px; }
.ap-who { display:flex; align-items:center; gap:8px; min-width:0; }
.ap-av { width:30px; height:30px; border-radius:50%; color:#0b1220; font-size:11px; font-weight:900; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
.ap-name { font-weight:800; color:var(--text-white); font-size:13px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.ap-inactive { margin-left:6px; font-size:9px; color:#dc2626; font-weight:800; text-transform:uppercase; }
.ap-sub { font-size:10.5px; color:var(--text-dim); margin-top:2px; }
.ap-big { font-weight:800; color:var(--text-white); white-space:nowrap; }
.ap-bar { height:5px; background:var(--border-dim); border-radius:999px; overflow:hidden; margin-top:5px; }
.ap-bar > div { height:100%; border-radius:999px; transition:width .3s; }
.ap-lbl { display:none; }
.ap-skel { height:44px; margin:10px 14px; border-radius:8px; background:var(--bg-card); }
.ap-empty { text-align:center; padding:30px; color:var(--text-dim); font-size:12px; }
.ap-note { display:flex; gap:8px; align-items:flex-start; padding:10px 14px; font-size:11px; color:var(--text-dim); line-height:1.5; }

.ap-detail { padding:14px 18px 18px; border-top:1px dashed var(--border); }
.ap-strip { display:flex; gap:16px; flex-wrap:wrap; font-size:12px; color:var(--text-dim); margin-bottom:12px; }
.ap-strip b { color:var(--text-white); }
.ap-strip b.ap-violet { color:#8b5cf6; } .ap-strip b.ap-amber { color:#d97706; }
.ap-tab { padding:6px 12px; border-radius:8px; font-size:11px; font-weight:800; cursor:pointer; font-family:inherit;
  border:1px solid var(--border-mid); background:transparent; color:var(--text-muted); }
.ap-tab.on { border-color:rgba(139,92,246,.55); background:rgba(139,92,246,.12); color:#8b5cf6; }
.ap-pill { padding:4px 11px; border-radius:999px; font-size:10.5px; font-weight:800; cursor:pointer; font-family:inherit;
  border:1px solid var(--border-mid); background:transparent; color:var(--text-muted); }
.ap-pill.on { border-color:var(--orange-ring); background:var(--orange-dim); color:var(--orange); }

.ap-table { border:1px solid var(--border-dim); border-radius:10px; overflow:hidden; background:var(--bg-surface); }
.ap-inv { display:grid; gap:10px; align-items:start; padding:9px 12px;
  grid-template-columns: minmax(0,1fr) minmax(0,.9fr) minmax(0,1.6fr) minmax(0,1.7fr) minmax(0,1fr) minmax(0,.9fr) minmax(0,.9fr) minmax(0,.9fr); }
.ap-prod { display:grid; gap:10px; padding:9px 12px; grid-template-columns: minmax(0,3fr) minmax(0,1fr) minmax(0,1fr) minmax(0,1.2fr); }
.ap-inv-head { font-size:9.5px; font-weight:800; text-transform:uppercase; letter-spacing:.06em; color:var(--text-ghost); border-bottom:1px solid var(--border-dim); }
.ap-inv-row { font-size:12px; color:var(--text-muted); border-bottom:1px solid var(--table-row-border); }
.ap-inv-foot { font-size:12px; font-weight:800; color:var(--text-white); }
.ap-span5 { grid-column: span 5; }
.ap-invno { font-weight:800; color:#ea580c; font-family:monospace; }
.ap-clickable { cursor:pointer; text-decoration: underline dotted; }
.ap-clients { display:grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap:8px; }
.ap-client { background:var(--bg-card); border:1px solid var(--border-dim); border-radius:10px; padding:10px 12px; min-width:0; }
.ap-clickable-card { cursor:pointer; }
.ap-clickable-card:hover { border-color:var(--green-ring); }

@media (max-width: 1100px) {
  .ap-grid-head { display:none; }
  .ap-grid { grid-template-columns: repeat(3, minmax(0,1fr)); gap:10px 14px; }
  .ap-rank { display:none; }
  .ap-who { grid-column: 1 / -1; }
  .ap-item .r { text-align:left; }
  .ap-lbl { display:block; font-size:9px; font-weight:800; text-transform:uppercase; letter-spacing:.07em; color:var(--text-ghost); margin-bottom:2px; }
  .ap-inv-head { display:none; }
  .ap-inv { grid-template-columns: repeat(3, minmax(0,1fr)); }
  .ap-inv > div:first-child { grid-column: 1 / -1; }
  .ap-inv .r { text-align:left; }
  .ap-span5 { grid-column: 1 / -1; }
  .ap-prod { grid-template-columns: repeat(3, minmax(0,1fr)); }
  .ap-prod > div:first-child { grid-column: 1 / -1; }
  .ap-prod .r { text-align:left; }
}
@media (max-width: 560px) {
  .ap-grid, .ap-inv, .ap-prod { grid-template-columns: repeat(2, minmax(0,1fr)); }
}

/* ── Agent detail page ── */
.ap-item .ap-who svg { color: var(--text-dim); transition: transform .15s, color .15s; }
.ap-item:hover .ap-who svg { color:#8b5cf6; transform: translateX(2px); }
.apd-head { display:flex; align-items:center; gap:14px; margin-bottom:18px; flex-wrap:wrap; }
.apd-back { width:38px; height:38px; border-radius:10px; border:1px solid var(--border-mid); background:var(--bg-card);
  color:var(--text-muted); display:flex; align-items:center; justify-content:center; cursor:pointer; flex-shrink:0; }
.apd-back:hover { border-color:rgba(139,92,246,.6); color:#8b5cf6; }
.apd-av { width:52px; height:52px; border-radius:50%; color:#0b1220; font-size:17px; font-weight:900;
  display:flex; align-items:center; justify-content:center; flex-shrink:0; box-shadow:0 0 0 4px rgba(139,92,246,.12); }
.apd-crumb { font-size:11px; color:var(--text-dim); margin-bottom:2px; }
.apd-loading { display:flex; align-items:center; justify-content:center; gap:8px; min-height:220px; color:var(--text-dim); font-size:12px; }
.apd-grid { display:grid; grid-template-columns: repeat(3, minmax(0,1fr)); gap:14px; margin-bottom:18px; }
.apd-card { background:var(--bg-surface); border:1px solid var(--border); border-radius:14px; padding:14px 16px 16px; min-width:0; }
.apd-card.wide { grid-column: 1 / -1; }
.apd-grid > .apd-card:nth-last-child(-n+2) { grid-column: span 1; }
.apd-card-head { margin-bottom:10px; }
.apd-card-title { font-size:12px; font-weight:800; color:var(--text-white); text-transform:uppercase; letter-spacing:.07em; }
.apd-card-sub { font-size:11px; color:var(--text-dim); margin-top:2px; }
.apd-chart { position:relative; height:240px; }
.apd-chart.tall { height:300px; }
.apd-ring { position:relative; height:250px; }
.apd-ring-center { position:absolute; left:0; right:0; top:0; bottom:44px; display:flex; flex-direction:column;
  align-items:center; justify-content:center; pointer-events:none; }
.apd-ring-top { font-size:24px; font-weight:900; color:var(--text-white); line-height:1; }
.apd-ring-bottom { font-size:10px; color:var(--text-dim); text-transform:uppercase; letter-spacing:.08em; margin-top:4px; }
.apd-empty { display:flex; align-items:center; justify-content:center; min-height:180px; font-size:12px; color:var(--text-dim);
  border:1px dashed var(--border); border-radius:10px; }
.apd-tables .ap-detail { border-top:none; }
@media (min-width: 1101px) {
  /* products + top clients share the last row 50/50 */
  .apd-grid { grid-template-columns: repeat(6, minmax(0,1fr)); }
  .apd-grid > .apd-card { grid-column: span 2; }
  .apd-grid > .apd-card.wide { grid-column: 1 / -1; }
  .apd-grid > .apd-card:nth-last-child(-n+2) { grid-column: span 3; }
}
@media (max-width: 1100px) {
  .apd-grid { grid-template-columns: repeat(2, minmax(0,1fr)); }
  .apd-grid > .apd-card:nth-last-child(-n+2) { grid-column: 1 / -1; }
}
@media (max-width: 640px) {
  .apd-grid { grid-template-columns: minmax(0,1fr); }
  .apd-chart.tall { height:240px; }
}
`;
