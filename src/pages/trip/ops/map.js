import * as React from 'react'
import { T, ui } from './core.js'
import LTGEO from './indiaGeo.json'

  
  
  function Y() { return React; }
  var W = 380, H = 440, PAD = 10;
  var merc = function (lat) { return Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI / 180) / 2)) * 180 / Math.PI; };
  var B = { x0: 67.2, x1: 97.6, y0: merc(6.2), y1: merc(37.2) };
  var k = Math.min((W - PAD * 2) / (B.x1 - B.x0), (H - PAD * 2) / (B.y1 - B.y0));
  var ox = PAD + ((W - PAD * 2) - (B.x1 - B.x0) * k) / 2, oy = PAD + ((H - PAD * 2) - (B.y1 - B.y0) * k) / 2;
  var px = function (lon) { return ox + (lon - B.x0) * k; };
  var py = function (lat) { return oy + (B.y1 - merc(lat)) * k; };
  var statePaths = null;
  function states() {
    if (statePaths) return statePaths;
    var G = LTGEO; statePaths = [];
    if (!G || !G.ST) return statePaths;
    G.ST.forEach(function (s) {
      var d = '';
      s.r.forEach(function (r) { for (var i = 0; i < r.length - 1; i += 2) d += (i === 0 ? 'M' : 'L') + px(r[i]).toFixed(1) + ' ' + py(r[i + 1]).toFixed(1); d += 'Z'; });
      statePaths.push({ n: s.n, d: d });
    });
    return statePaths;
  }
  function pt(code) { var f = T.fac(code); return f && f.lat != null ? { x: px(f.lng), y: py(f.lat), f: f } : null; }
  // unique network segments (all 13 lanes) drawn faint
  var netSegs = null;
  function segs() {
    if (netSegs) return netSegs; var seen = {}; netSegs = [];
    T.NET.lanes.forEach(function (l) { for (var i = 0; i < l.path.length - 1; i++) { var a = l.path[i], b = l.path[i + 1], key = [a, b].sort().join('|'); if (!seen[key]) { seen[key] = 1; netSegs.push([a, b]); } } });
    return netSegs;
  }
  // fit viewBox to a set of codes
  function fitBox(codes) {
    var ps = codes.map(pt).filter(Boolean); if (!ps.length) return { cx: W / 2, cy: H / 2, z: 1 };
    var x0 = Math.min.apply(null, ps.map(function (p) { return p.x; })), x1 = Math.max.apply(null, ps.map(function (p) { return p.x; }));
    var y0 = Math.min.apply(null, ps.map(function (p) { return p.y; })), y1 = Math.max.apply(null, ps.map(function (p) { return p.y; }));
    var bw = Math.max(x1 - x0, 40) * 1.5, bh = Math.max(y1 - y0, 40) * 1.5;
    return { cx: (x0 + x1) / 2, cy: (y0 + y1) / 2, z: Math.max(1, Math.min(W / bw, H / bh, 5)) };
  }

  ui.RouteMap = function (o) {
    var y = Y(), e = y.createElement, path = o.path || [], sch = o.schedule || [];
    var st = y.useState({ mode: 'route', zoom: null, hover: null }), S = st[0];
    function up(p) { st[1](Object.assign({}, S, p)); }
    var fb = S.mode === 'india' ? { cx: W / 2, cy: H / 2, z: 1 } : fitBox(path);
    var z = S.zoom != null ? S.zoom : fb.z, vw = W / z, vh = H / z;
    var cx = S.zoom != null && S.cx != null ? S.cx : fb.cx, cy = S.zoom != null && S.cy != null ? S.cy : fb.cy;
    cx = Math.max(vw / 2, Math.min(W - vw / 2, cx)); cy = Math.max(vh / 2, Math.min(H - vh / 2, cy));
    var vb = [cx - vw / 2, cy - vh / 2, vw, vh].map(function (n) { return n.toFixed(1); }).join(' ');
    var fs = 9 / z, r1 = 3.2 / z, r2 = 5.5 / z;
    function zoomBy(m) { up({ zoom: Math.max(1, Math.min(8, z * m)), cx: cx, cy: cy }); }
    var onPath = {}; path.forEach(function (c) { onPath[c] = true; });
    var kids = [];
    kids.push(e('g', { key: 'st' }, states().map(function (s, i) { return e('path', { key: i, d: s.d, fill: '#eef2f7', stroke: '#cbd5e1', strokeWidth: 0.6 / z, vectorEffect: 'non-scaling-stroke' }, e('title', null, s.n)); })));
    kids.push(e('g', { key: 'net' }, segs().map(function (s, i) { var a = pt(s[0]), b = pt(s[1]); return a && b ? e('line', { key: i, x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#cbd5e1', strokeWidth: 1.2 / z, strokeDasharray: (3 / z) + ' ' + (3 / z) }) : null; })));
    // route legs
    var legs = [];
    for (var i = 0; i < path.length - 1; i++) {
      var a = pt(path[i]), b = pt(path[i + 1]); if (!a || !b) continue;
      var mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2, ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
      legs.push(e('g', { key: 'l' + i },
        e('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: '#D94F1C', strokeWidth: 2.6 / z, strokeLinecap: 'round' }),
        e('path', { d: 'M-3.2 -3 L3.2 0 L-3.2 3 Z', fill: '#D94F1C', transform: 'translate(' + mx + ' ' + my + ') rotate(' + ang + ') scale(' + (1 / z) + ')' }),
        z >= 1.6 ? e('text', { x: mx, y: my - 5 / z, fontSize: fs * 0.95, textAnchor: 'middle', fill: '#9a3412', fontWeight: 600, style: { paintOrder: 'stroke', stroke: '#fff', strokeWidth: 2.5 / z } }, T.legKm(path[i], path[i + 1]) + ' km') : null));
    }
    kids.push(e('g', { key: 'route' }, legs));
    if (o.twoWay && path.length > 1) { var a0 = pt(path[0]), b0 = pt(path[path.length - 1]); if (a0 && b0) kids.push(e('line', { key: 'ret', x1: a0.x, y1: a0.y, x2: b0.x, y2: b0.y, stroke: '#7C3AED', strokeWidth: 1.4 / z, strokeDasharray: (4 / z) + ' ' + (3 / z), opacity: 0.7 }, e('title', null, 'To-fro: return leg'))); }
    // facilities
    var dots = T.activeFac.map(function (f) {
      var p = pt(f.code); if (!p) return null; var on = !!onPath[f.code], hub = f.tier === 'Hub', idx = path.indexOf(f.code);
      var isEnd = idx === 0 || idx === path.length - 1, can = !isEnd && (o.onToggle);
      return e('g', { key: f.code, style: { cursor: can ? 'pointer' : 'default' }, onClick: can ? function () { o.onToggle(f.code); } : undefined, onMouseEnter: function () { up({ hover: f.code }); }, onMouseLeave: function () { up({ hover: null }); } },
        e('title', null, f.code + ' · ' + f.name + ' (' + f.tier + ')' + (on ? '' : ' — click to add as pit-stop') + (on && !isEnd ? ' — click to remove' : '')),
        e('circle', { cx: p.x, cy: p.y, r: on ? r2 : (hub ? r1 * 1.15 : r1 * 0.8), fill: on ? (idx === 0 ? '#16a34a' : (idx === path.length - 1 ? '#1d4ed8' : '#D94F1C')) : (hub ? '#475569' : '#fff'), stroke: on ? '#fff' : '#64748b', strokeWidth: (on ? 1.5 : 1) / z }),
        on ? e('text', { x: p.x, y: p.y + fs * 0.34, fontSize: fs * 0.95, textAnchor: 'middle', fill: '#fff', fontWeight: 700, style: { pointerEvents: 'none' } }, String(idx + 1)) : null,
        (on || S.mode === 'india' && z < 1.5 && hub || z >= 2.2 || S.hover === f.code) ? e('text', { x: p.x + (on ? r2 + 2 / z : r1 + 2 / z), y: p.y + fs * 0.35, fontSize: fs, fill: on ? '#0f172a' : '#64748b', fontWeight: on ? 700 : 500, style: { paintOrder: 'stroke', stroke: '#fff', strokeWidth: 2.5 / z, pointerEvents: 'none' } }, T.facShort(f.code)) : null);
    });
    kids.push(e('g', { key: 'fac' }, dots));
    var G = LTGEO;
    var btn = function (lab, fn, t) { return e('button', { type: 'button', title: t, onClick: fn, className: 'lt4-rm-btn' }, lab); };
    return e('div', { className: 'lt4-rm' },
      e('div', { className: 'lt4-rm-box' },
        e('svg', { viewBox: vb, className: 'lt4-rm-svg', preserveAspectRatio: 'xMidYMid meet' }, kids),
        e('div', { className: 'lt4-rm-ctl' }, btn('+', function () { zoomBy(1.4); }, 'Zoom in'), btn('−', function () { zoomBy(1 / 1.4); }, 'Zoom out'), btn('Route', function () { up({ mode: 'route', zoom: null }); }, 'Fit to the route'), btn('India', function () { up({ mode: 'india', zoom: null }); }, 'Whole of India')),
        !G ? e('div', { className: 'lt4-note', style: { position: 'absolute', top: 8, left: 8 } }, 'India outline unavailable (LTGEO not loaded) — showing hubs only.') : null),
      e('div', { className: 'lt4-rm-legend' },
        e('span', null, e('i', { style: { background: '#16a34a' } }), 'Origin'), e('span', null, e('i', { style: { background: '#D94F1C' } }), 'Pit-stop'), e('span', null, e('i', { style: { background: '#1d4ed8' } }), 'Destination'),
        e('span', null, e('i', { style: { background: '#475569' } }), 'Hub'), e('span', null, e('i', { style: { background: '#fff', border: '1px solid #64748b' } }), 'Mini-hub'),
        o.twoWay ? e('span', null, e('i', { style: { background: '#7C3AED' } }), 'Return leg') : null),
      e('div', { className: 'lt4-note' }, 'Click a hub on the map to add it as a pit-stop (click again to remove). Legs are straight-line between hubs; road geometry (and tolls) would come from a routing engine such as OSRM / Mappls in production.'));
  };
  var css = document.createElement('style');
  css.textContent = '.lt4-rm{display:flex;flex-direction:column;gap:8px}.lt4-rm-box{position:relative;border:1px solid #e2e8f0;border-radius:14px;background:#f8fafc;overflow:hidden}.lt4-rm-svg{display:block;width:100%;height:auto;aspect-ratio:' + W + '/' + H + '}'
    + '.lt4-rm-ctl{position:absolute;top:8px;right:8px;display:flex;flex-direction:column;gap:4px}.lt4-rm-btn{border:1px solid #e2e8f0;background:#fff;border-radius:8px;padding:3px 8px;font-size:11.5px;font-weight:600;color:#334155;cursor:pointer}.lt4-rm-btn:hover{border-color:#D94F1C;color:#B8410E}'
    + '.lt4-rm-legend{display:flex;flex-wrap:wrap;gap:10px;font-size:11px;color:#64748b}.lt4-rm-legend span{display:inline-flex;align-items:center;gap:5px}.lt4-rm-legend i{width:9px;height:9px;border-radius:50%;display:inline-block}'
    + '.lt4-two>span:last-child{text-align:right;min-width:0;overflow-wrap:anywhere}'
    + '.lt4-grid>*{min-width:0}.lt4-wrap .lt2-table th,.lt4-wrap .lt2-table td{padding:9px 8px;white-space:normal}.lt4-wrap .lt2-table td.lt4-num,.lt4-wrap .lt2-table th.lt4-num{white-space:nowrap}.lt4-wrap .lt2-table th{font-size:10.5px;letter-spacing:.03em}.lt4-g-cewb{grid-template-columns:minmax(0,1fr) 410px}.lt4-gs{grid-template-columns:minmax(0,1.4fr) minmax(0,1fr)}@media(max-width:1599px){.lt4-gs{grid-template-columns:1fr}}@media(max-width:1499px){.lt4-g-cewb{grid-template-columns:1fr}.lt4-g-cewb>div:last-child{order:-1}}'
    + '.lt4-g-map{grid-template-columns:minmax(0,1fr) 380px}@media(max-width:1150px){.lt4-g-map{grid-template-columns:1fr}}';
  document.head.appendChild(css);
