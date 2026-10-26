import * as React from 'react'
import { T, ui } from './core.js'
import './screensA.js'


  
  var e = T.e, F = T.fmt, inr = F.inr;
  var U = T.ui2, Field = U.Field, Sel = U.Sel, Btn = U.Btn, Th = U.Th, stateChip = U.stateChip;
  function Y() { return React; }
  function legTabs(t, dir, set) {
    return e('div', { className: 'lt2-tabs' }, [['fwd', 'Forward  ' + T.facShort(t.leg.fwd.path[0]) + ' → ' + T.facShort(t.leg.fwd.path[t.leg.fwd.path.length - 1])]].concat(t.leg.ret ? [['ret', 'Return  ' + T.facShort(t.leg.ret.path[0]) + ' → ' + T.facShort(t.leg.ret.path[t.leg.ret.path.length - 1])]] : [])
      .map(function (x) { return e('button', { key: x[0], type: 'button', className: 'lt2-tab' + (dir === x[0] ? ' active' : ''), onClick: function () { set(x[0]); } }, x[1]); }));
  }
  function printHtml(title, body) {
    try {
      var w = window.open('', '_blank'); if (!w) return;
      w.document.write('<!doctype html><title>' + title + '</title><style>body{font:12px Inter,Arial,sans-serif;margin:24px;color:#0f172a}h1{font-size:18px;margin:0 0 4px}table{border-collapse:collapse;width:100%;margin:10px 0}th,td{border:1px solid #cbd5e1;padding:5px 7px;text-align:left;font-size:11px}th{background:#f1f5f9}.k{display:grid;grid-template-columns:repeat(3,1fr);gap:4px 16px;margin:8px 0}</style>' + body + '<script>window.print()<\/script>');
      w.document.close();
    } catch (x) { }
  }
  function dirOf(t) { var q = T.hashParam('dir'); return (q && t.leg[q]) ? q : t.activeDir; }

  // =====================================================================================================
  // Manifest  —  Σ(dockets) − vehicle, per-stop offload plan, to-fro
  // =====================================================================================================
  export const Manifest = function () {
    var y = Y(); T.useStore();
    var t = T.pickTrip(function (x) { return !!x.vehicle; }) || T.pickTrip();
    var st = y.useState({ dir: null, msg: null, lim: 40, only: 'all' }); var S = st[0]; function up(p) { st[1](Object.assign({}, S, p)); }
    if (!t) return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' }, ui.Header('Manifest', 'No trips.'), ui.Empty('Plan a trip first.'));
    T.applyCtx(t);
    var dir = S.dir && t.leg[S.dir] ? S.dir : dirOf(t), L = t.leg[dir], other = t.leg[dir === 'fwd' ? 'ret' : 'fwd'];
    if (!t.vehicle) return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' }, ui.Header('Manifest · To-Fro', 'Σ dockets against the vehicle.'), ui.StageBar(t, 3), ui.TripPicker(t), e('div', { className: 'lt2-banner', style: { background: '#fffbeb', color: '#92400e' } }, 'Assign a vehicle to ' + t.id + ' first — the manifest is measured against its payload.  ', Btn('Go to Vehicle Assign →', function () { T.go('/trip-ops/vehicle-assign', t.id); }, 'primary', { sm: true })));
    var vt = T.vtype(t.vehicleType), tot = T.legTotals(L), ds = T.legDockets(L);
    var headKg = vt.capKg - tot.act, headCft = vt.capCft - tot.cft;
    var eligible = T.dockets.filter(function (d) { return T.eligible(L, d); });
    var shown = eligible.filter(function (d) { return S.only === 'all' || (S.only === 'origin' ? d.loc === L.path[0] : d.loc !== L.path[0]); });
    var legThc = dir === 'fwd' ? t.thc.amount : T.partnerCost({ vehicleType: t.vehicleType, sourcing: t.sourcing, km: T.pathKm(L.path), method: 'km', stops: L.path.length }).thc;
    var eco = T.economics(t, L, legThc);
    var ecoO = other ? T.economics(t, other, other.dir === 'fwd' ? t.thc.amount : T.partnerCost({ vehicleType: t.vehicleType, sourcing: t.sourcing, km: T.pathKm(other.path), method: 'km', stops: other.path.length }).thc) : null;
    var ordered = T.lifoOrder(L, ds);
    var cells = T.layout(L, ds);

    function addAll() {
      var order = eligible.slice().sort(function (a, b) { return (b.prio === 'Priority') - (a.prio === 'Priority') || L.path.indexOf(b.dest) - L.path.indexOf(a.dest) || b.actWt - a.actWt; }), n = 0, why = '';
      order.forEach(function (d) { var r = T.addToManifest(t, L, d); if (r.ok) n++; else why = r.why; });
      T.emit(); up({ msg: n + ' docket' + (n === 1 ? '' : 's') + ' added' + (why ? ' · stopped: ' + why : '') });
    }
    function importEstimate() {
      var n = 0; (t.pricing && t.pricing.selection || []).forEach(function (no) { var d = T.docketByNo(no); if (d && T.addToManifest(t, L, d).ok) n++; }); T.emit(); up({ msg: n + ' docket(s) imported from the pricing estimate' });
    }
    function lock() {
      L.locked = true; L.mnfNo = 'MNF-2610-' + F.pad(T.MNF_SEQ(), 4); ds.forEach(function (d) { d.status = 'Locked (CEWB)'; }); T.emit(); up({ msg: L.mnfNo + ' locked — dockets locked for CEWB' });
    }
    function unlock() { if (L.cewb) return; L.locked = false; ds.forEach(function (d) { d.status = 'Manifested'; }); T.emit(); }
    function enableReturn() {
      var p = t.leg.fwd.path.slice().reverse(); t.twoWay = true;
      t.leg.ret = { dir: 'ret', path: p, departTs: t.leg.fwd.departTs + (p.length * 6 + 10) * 3600000, manifest: [], locked: false, mnfNo: null, tcs: [], cewb: null, exec: null, arrival: null, closure: null, done: false }; T.emit();
    }
    var stopRows = L.path.map(function (code, i) {
      var un = ds.filter(function (d) { return d.dest === code; }), ld = ds.filter(function (d) { return (d.loadAt || d.loc) === code; });
      var onb = ds.filter(function (d) { return L.path.indexOf(d.loadAt || d.loc) <= i && L.path.indexOf(d.dest) > i; });
      return { code: code, i: i, un: un, ld: ld, onbKg: onb.reduce(function (s, d) { return s + d.actWt; }, 0), onbN: onb.length };
    });

    var kpis = e('div', { className: 'lt4-grid lt4-g4' }, [
      ui.Kpi('Σ dockets', tot.dockets + ' · ' + tot.packs + ' packs', Math.round(tot.act) + ' kg actual · ' + Math.round(tot.charged) + ' kg charged'),
      ui.Kpi('Vehicle', t.vehicle.regNo, vt.type + ' · ' + vt.capKg.toLocaleString('en-IN') + ' kg / ' + vt.capCft + ' cft'),
      ui.Kpi('Σ dockets − vehicle', (headKg >= 0 ? '' : '+') + Math.abs(Math.round(headKg)).toLocaleString('en-IN') + ' kg ' + (headKg >= 0 ? 'headroom' : 'OVER'), (headCft >= 0 ? F.r1(headCft) + ' cft free' : F.r1(-headCft) + ' cft over'), headKg < 0 || headCft < 0 ? 'bad' : (headKg / vt.capKg < 0.15 ? 'good' : 'warn')),
      ui.Kpi('Manifest', L.mnfNo || 'draft', L.locked ? 'locked for CEWB' : 'editable', L.locked ? 'good' : '')].map(function (k, i) { return e('div', { key: i }, k); }));
    var bars = e('div', { className: 'lt4-grid lt4-g2' }, ui.Bar(tot.act / vt.capKg * 100, 'Weight  ' + Math.round(tot.act).toLocaleString('en-IN') + ' / ' + vt.capKg.toLocaleString('en-IN') + ' kg  (' + Math.round(tot.act / vt.capKg * 100) + '%)'), ui.Bar(tot.cft / vt.capCft * 100, 'Volume  ' + F.r1(tot.cft) + ' / ' + vt.capCft + ' cft  (' + Math.round(tot.cft / vt.capCft * 100) + '%)'));

    var pool = ui.Card('Docket stock that travels on this leg', e('div', { className: 'lt2-row' }, e('div', { className: 'lt2-tabs' }, [['all', 'All'], ['origin', 'At ' + T.facShort(L.path[0])], ['pit', 'At pit-stops']].map(function (x) { return e('button', { key: x[0], type: 'button', className: 'lt2-tab' + (S.only === x[0] ? ' active' : ''), onClick: function () { up({ only: x[0] }); } }, x[1]); })), Btn('Add all that fit', addAll, 'primary', { sm: true, disabled: L.locked || !eligible.length })),
      eligible.length === 0 ? ui.Empty('No docket stock at these hubs for this direction.') : e('div', { className: 'lt4-tbl-wrap', style: { maxHeight: 420, overflowY: 'auto' } }, e('table', { className: 'lt2-table' }, Th(['Docket', 'Load at → Offload at', { t: 'Packs', num: 1 }, { t: 'kg', num: 1 }, { t: 'cft', num: 1 }, 'EWB', '']),
        e('tbody', null, shown.slice(0, S.lim).map(function (d) {
          var chk = d.ewbNo ? (d.ewbValidTill < T.ETA_AT(L, d.dest) ? ui.Chip('expires early', 'amber') : ui.Chip('ok', 'green')) : (d.invoice >= 50000 ? ui.Chip('missing', 'red') : ui.Chip('exempt', 'ph'));
          return e('tr', { key: d.no }, e('td', null, T.fmtDocket(d.no), e('div', { className: 'lt2-muted' }, d.client + (d.prio === 'Priority' ? ' · priority' : ''))), e('td', null, T.facShort(d.loc) + ' → ' + T.facShort(d.dest), d.loc !== L.path[0] ? e('div', { className: 'lt2-muted' }, 'pit-stop pickup') : null),
            e('td', { className: 'lt4-num' }, d.packs), e('td', { className: 'lt4-num' }, Math.round(d.actWt)), e('td', { className: 'lt4-num' }, F.r1(d.cft)), e('td', null, chk),
            e('td', null, Btn('Add', function () { var r = T.addToManifest(t, L, d); T.emit(); up({ msg: r.ok ? 'Added ' + T.fmtDocket(d.no) : r.why }); }, 'ghost', { sm: true, disabled: L.locked })));
        })))),
      shown.length > S.lim ? e('div', { style: { padding: '8px 0' } }, Btn('Show more (' + (shown.length - S.lim) + ')', function () { up({ lim: S.lim + 40 }); }, 'ghost', { sm: true })) : null);

    var mf = ui.Card('Manifest · ' + (L.mnfNo || 'draft') + ' · load order (LIFO)', e('div', { className: 'lt2-row' }, t.pricing && t.pricing.selection && !ds.length ? Btn('Import pricing selection', importEstimate, 'ghost', { sm: true }) : null, L.locked ? (L.cewb ? ui.Chip('CEWB generated', 'green') : Btn('Unlock', unlock, 'ghost', { sm: true })) : Btn('Lock manifest', lock, 'primary', { sm: true, disabled: !ds.length || headKg < 0 || headCft < 0 })),
      ds.length === 0 ? ui.Empty('Nothing on this manifest yet — add dockets from the stock list.') : e('div', { className: 'lt4-tbl-wrap', style: { maxHeight: 420, overflowY: 'auto' } }, e('table', { className: 'lt2-table' }, Th(['#', 'Docket', 'Load at', 'Offload at', { t: 'Packs', num: 1 }, { t: 'kg', num: 1 }, '']),
        e('tbody', null, ordered.map(function (d, i) {
          return e('tr', { key: d.no }, e('td', null, i + 1), e('td', null, T.fmtDocket(d.no), e('div', { className: 'lt2-muted' }, d.client)), e('td', null, T.facShort(d.loadAt || d.loc)), e('td', null, e('b', null, T.facShort(d.dest))), e('td', { className: 'lt4-num' }, d.packs), e('td', { className: 'lt4-num' }, Math.round(d.actWt)),
            e('td', null, L.locked ? null : Btn('✕', function () { T.removeFromManifest(t, L, d); T.emit(); }, 'ghost', { sm: true })));
        })))));

    var offload = ui.Card('Per-stop plan · unload / load / on-board', null, e('div', { className: 'lt4-tbl-wrap' }, e('table', { className: 'lt2-table' }, Th(['Stop', { t: 'Unload (dockets)', num: 1 }, { t: 'Load (dockets)', num: 1 }, { t: 'On board after (kg)', num: 1 }, 'Sch. arr → dep']),
      e('tbody', null, stopRows.map(function (r) {
        var sc = T.schedule(L.path, L.departTs)[r.i];
        return e('tr', { key: r.code }, e('td', null, e('b', null, T.facShort(r.code)), e('div', { className: 'lt2-muted' }, r.i === 0 ? 'origin' : (r.i === L.path.length - 1 ? 'final destination' : 'pit-stop'))), e('td', { className: 'lt4-num' }, r.un.length || '—'), e('td', { className: 'lt4-num' }, r.ld.length || '—'), e('td', { className: 'lt4-num' }, Math.round(r.onbKg).toLocaleString('en-IN')), e('td', null, (sc.arr ? F.dt(sc.arr) : '—') + ' → ' + (sc.dep ? F.dt(sc.dep) : '—')));
      })))));

    var tcCard = ui.Card('Trip challans (TC) per touch-point pair', ui.Chip('THC ' + inr(legThc), 'blue'), e('div', null, e('div', { className: 'lt4-tbl-wrap' }, e('table', { className: 'lt2-table' }, Th(['TC', 'Leg', { t: 'Dockets', num: 1 }, { t: 'Packs', num: 1 }, { t: 'Act. kg', num: 1 }, { t: 'Ton-km', num: 1 }, { t: 'Share of THC', num: 1 }, { t: '₹ / kg', num: 1 }]),
      e('tbody', null, eco.tcs.map(function (c) { return e('tr', { key: c.idx }, e('td', null, 'TC-' + t.id.slice(4) + (dir === 'ret' ? 'R' : '') + '-' + (c.idx + 1)), e('td', null, T.facShort(c.from) + ' → ' + T.facShort(c.to) + ' · ' + c.km + ' km'), e('td', { className: 'lt4-num' }, c.dockets), e('td', { className: 'lt4-num' }, c.packs), e('td', { className: 'lt4-num' }, Math.round(c.act)), e('td', { className: 'lt4-num' }, c.tonKm.toFixed(1)), e('td', { className: 'lt4-num' }, inr(c.share)), e('td', { className: 'lt4-num' }, c.act ? '₹' + c.perKg.toFixed(2) : '—')); })))),
      e('div', { className: 'lt4-grid lt4-g4', style: { marginTop: 10 } }, [ui.Kpi('Revenue', inr(eco.revenue), 'pre-GST'), ui.Kpi('Contribution', inr(eco.contribution), Math.round(eco.costPctRev) + '% cost / revenue', eco.contribution >= 0 ? 'good' : 'bad'), ui.Kpi('Cap util (ton-km)', Math.round(eco.capUtil * 100) + '%', ''), ui.Kpi('Cost / kg', ds.length ? '₹' + eco.costPerKg.toFixed(2) : '—', '₹' + eco.thcPerTonKm.toFixed(2) + ' / ton-km')].map(function (k, i) { return e('div', { key: i }, k); }))));

    var truck = ui.Card('Truck load layout (LIFO)', ui.Chip('door ↓', 'ph'), e('div', null, e('div', { className: 'lt4-note', style: { marginBottom: 8 } }, 'Front of truck at the top. Farthest-destination dockets load first (front); first-to-unload sit nearest the door.'),
      e('div', { className: 'lt4-truck' }, ['LF', 'CF', 'RF', 'LM', 'CM', 'RM', 'LB', 'CB', 'RB'].map(function (k) {
        var c = cells[k]; return e('div', { key: k, className: 'lt4-cell' }, e('b', null, k), c.slice(0, 3).map(function (d) { return e('span', { key: d.no }, '→' + T.facShort(d.dest) + ' · ' + Math.round(d.actWt) + 'kg'); }), c.length > 3 ? e('span', { className: 'lt2-muted' }, '+' + (c.length - 3) + ' more') : null);
      }))));

    // to-fro
    var tofro = !t.leg.ret ? ui.Card('To-fro (return leg)', null, e('div', { className: 'lt2-row' }, e('span', { className: 'lt4-note' }, 'This is a one-way trip. Enable a return leg to carry ' + T.facShort(t.leg.fwd.path[t.leg.fwd.path.length - 1]) + ' → ' + T.facShort(t.leg.fwd.path[0]) + ' dockets on the way back.'), Btn('Enable return leg', enableReturn, 'ghost', { sm: true }))) :
      (function () {
        var f = t.leg.fwd, r = t.leg.ret, tf = T.legTotals(f), tr = T.legTotals(r), kf = T.pathKm(f.path), kr = T.pathKm(r.path);
        var ef = T.economics(t, f, t.thc.amount), er = T.economics(t, r, T.partnerCost({ vehicleType: t.vehicleType, sourcing: t.sourcing, km: kr, method: 'km', stops: r.path.length }).thc);
        var loaded = (tf.act ? kf : 0) + (tr.act ? kr : 0), total = kf + kr, comb = (ef.sumTonKm + er.sumTonKm) / ((ef.tripTonKm + er.tripTonKm) || 1);
        return ui.Card('To-fro · forward + return', ui.Chip(tr.act ? 'backhaul loaded' : 'empty return', tr.act ? 'green' : 'amber'), e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
          e('div', { className: 'lt4-tbl-wrap' }, e('table', { className: 'lt2-table' }, Th(['Direction', { t: 'km', num: 1 }, { t: 'Dockets', num: 1 }, { t: 'kg', num: 1 }, { t: 'Util', num: 1 }, { t: 'THC', num: 1 }, { t: 'Revenue', num: 1 }, { t: 'Contribution', num: 1 }]),
            e('tbody', null, [['Forward', f, tf, kf, ef], ['Return', r, tr, kr, er]].map(function (x) { return e('tr', { key: x[0] }, e('td', null, x[0] + ' · ' + T.facShort(x[1].path[0]) + ' → ' + T.facShort(x[1].path[x[1].path.length - 1])), e('td', { className: 'lt4-num' }, x[3]), e('td', { className: 'lt4-num' }, x[2].dockets), e('td', { className: 'lt4-num' }, Math.round(x[2].act)), e('td', { className: 'lt4-num' }, Math.round(x[2].act / vt.capKg * 100) + '%'), e('td', { className: 'lt4-num' }, inr(x[4].thc)), e('td', { className: 'lt4-num' }, inr(x[4].revenue)), e('td', { className: 'lt4-num', style: { color: x[4].contribution >= 0 ? '#047857' : '#b91c1c' } }, inr(x[4].contribution))); })))),
          e('div', { className: 'lt4-grid lt4-g3' }, [ui.Kpi('Round-trip contribution', inr(ef.contribution + er.contribution), 'forward + return', ef.contribution + er.contribution >= 0 ? 'good' : 'bad'), ui.Kpi('Loaded km', Math.round(loaded / total * 100) + '%', loaded + ' of ' + total + ' km carry cargo'), ui.Kpi('Round-trip cap util', Math.round(comb * 100) + '%', 'ton-km carried / available')].map(function (k, i) { return e('div', { key: i }, k); })),
          e('div', { className: 'lt4-note' }, 'The return THC shown is a partner-cost estimate for the reverse path; commercial treatment of two-way hires (single THC vs one per direction) is a decision to confirm with Bala / finance.')));
      })();

    return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' },
      ui.Header('Manifest · To-Fro', 'Σ(dockets) − vehicle: build the load for each direction, see the per-stop unload / load plan, and lock it for CEWB.'),
      ui.StageBar(t, 3), e('div', { className: 'lt2-row', style: { justifyContent: 'space-between' } }, ui.TripPicker(t), legTabs(t, dir, function (d) { up({ dir: d }); })),
      ui.Card(t.id + ' · ' + (dir === 'fwd' ? 'Forward' : 'Return') + ' leg', ui.Chip(L.locked ? 'locked' : 'draft', L.locked ? 'green' : 'amber'), ui.Path(L.path)),
      S.msg ? e('div', { className: 'lt2-banner success' }, S.msg) : null, kpis, bars,
      e('div', { className: 'lt4-grid lt4-gs' }, pool, mf), offload, e('div', { className: 'lt4-grid lt4-gs' }, tcCard, truck), tofro,
      e('div', { className: 'lt2-row', style: { justifyContent: 'flex-end' } }, L.locked ? Btn('Next: CEWB →', function () { T.go('/trip-ops/cewb' + '', t.id); }, 'primary') : e('span', { className: 'lt2-muted' }, 'Lock the manifest to continue to CEWB.')));
  };

  // =====================================================================================================
  // CEWB
  // =====================================================================================================
  // Decided CEWB logic, written out for the team. Text only; the CEWB generation itself is not built yet.
  function logicCard() {
    var li = function (b, t) { return e('li', { key: b, style: { marginBottom: 6 } }, e('b', null, b + ' '), t); };
    return ui.Card('CEWB logic (decided, not built yet)', ui.Chip('text only', 'ph'), e('ul', { style: { margin: 0, paddingLeft: 18, fontSize: 12.5, lineHeight: 1.55, color: '#475569' } }, [
      li('Level.', 'One CEWB per vehicle per leg. It bundles the e-way bills of every docket on that vehicle into one document.'),
      li('Where it is made.', 'On the mid-mile manifest (this page) and on the DRS. It is not made on the PRS: pickups keep being added on the way, so the load is never final there. For the PRS leg each e-way bill is valid on its own.'),
      li('When it is auto-generated.', 'Manifest: when the manifest is closed (locked) and a vehicle is assigned. DRS: when the DRS is dispatched and locked. In both cases only if at least one docket has an e-way bill. No button press is needed; the Generate button stays as a retry.'),
      li('What goes in.', 'Only dockets that have an e-way bill. Dockets without one (below the value threshold or exempt goods) travel on the invoice and are left out. One CEWB holds up to ' + T.EWB_MAX_PER_CEWB + ' e-way bills (confirm against the NIC portal); a bigger load is split into more than one CEWB.'),
      li('Checks before generating.', 'Every e-way bill must be valid for the whole route and schedule. A missing or expired one is a blocker. One that expires early is a warning that can be extended or acknowledged.'),
      li('Changes.', 'A CEWB cannot be edited once generated. If a docket is added or removed, or the vehicle changes, a new version is generated and the old one is marked replaced. The version history on this page shows each one, and the latest is the current one.'),
      li('New vehicle at a hub.', 'The next leg has its own vehicle, so it gets its own CEWB, and the Part-B vehicle number is updated on its e-way bills.'),
      li('If generation fails.', 'The page shows Failed with a retry. A vehicle carrying dockets with e-way bills should not depart without a valid CEWB.'),
      li('Register.', 'Every CEWB, from the manifest and the DRS, is listed in the E-way Bill Console under a Consolidated tab (to be built).')
    ]));
  }

  export const Cewb = function () {
    return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' }, ui.Header('Consolidated E-Way Bill', 'How the CEWB will work in the Trip Module.'), logicCard());
  };

  // =====================================================================================================
  // Shared: scan console + stop panel (used by Scan→Descan and Final Hub Arrival)
  // =====================================================================================================
  function ScanConsole(p) {
    var y = Y(), t = p.t, L = p.L, idx = p.idx, mode = p.mode, s = L.exec.stops[idx];
    var st = y.useState({ txt: '', feed: [], pend: null, ovr: T.LIFO_OVERRIDES[0] }); var S = st[0]; function up(q) { st[1](Object.assign({}, S, q)); }
    var list = mode === 'unload' ? T.expectedUnload(L, idx) : T.packsToLoad(L, idx).sort(function (a, b) { return L.path.indexOf(T.docketByPack(b).dest) - L.path.indexOf(T.docketByPack(a).dest); });
    var done = mode === 'unload' ? s.unloaded.length : s.loaded.length, totalN = list.length + done;
    function push(f, r) { return f.concat([{ cls: r.result === 'ok' ? 'ok' : (r.result === 'dup' || r.result === 'lifo' || r.result === 'ahead' || r.result === 'missed' || r.result === 'extra' ? 'warn' : 'bad'), msg: r.msg }]).slice(-40); }
    function scan(pk, ov) {
      var r = mode === 'unload' ? T.scanUnload(L, idx, pk) : T.scanLoad(t, L, idx, pk, ov);
      T.emit(); up({ txt: '', feed: push(S.feed, r), pend: r.result === 'lifo' ? pk : null });
    }
    function scanMany(arr) {
      var feed = S.feed.slice(), n = 0; arr.forEach(function (pk) { var r = mode === 'unload' ? T.scanUnload(L, idx, pk) : T.scanLoad(t, L, idx, pk, null); if (r.result === 'ok') n++; else feed = push(feed, r); });
      feed = feed.concat([{ cls: 'ok', msg: n + ' pack' + (n === 1 ? '' : 's') + ' scanned' }]); T.emit(); up({ feed: feed });
    }
    function simAhead() { var cand = L.exec.onboard.filter(function (pk) { var d = T.docketByPack(pk); return d && L.path.indexOf(d.dest) > idx; })[0]; if (cand) scan(cand); else up({ feed: S.feed.concat([{ cls: 'warn', msg: 'No pack for a later stop is on board.' }]) }); }
    function simExtra() { var d = T.dockets.filter(function (q) { return q.status === 'At hub' && q.dest !== L.path[idx]; })[0]; if (d) scan(T.packNo(d.no, 1)); }
    function simLifo() { var near = list.slice().reverse()[0]; if (near) scan(near); }
    var chips = list.slice(0, 12).map(function (pk) { return e('button', { key: pk, type: 'button', className: 'lt4-chip btn', onClick: function () { scan(pk); }, title: (T.docketByPack(pk) || {}).client || '' }, pk.slice(0, 4) + ' ' + pk.slice(4, 8) + ' ' + pk.slice(8, 10) + ' ' + pk.slice(10) + (mode === 'load' ? ' → ' + T.facShort((T.docketByPack(pk) || {}).dest) : '')); });
    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      e('div', { className: 'lt2-row', style: { justifyContent: 'space-between' } }, e('b', { style: { fontSize: 13 } }, (mode === 'unload' ? 'Unloading scan' : 'Loading scan (LIFO)') + ' · ' + done + ' / ' + totalN + ' packs'), ui.Chip(mode === 'unload' ? 'expected here: ' + list.length + ' left' : 'to load: ' + list.length + ' left', 'blue')),
      ui.Bar(totalN ? done / totalN * 100 : 100),
      e('form', { className: 'lt4-scan', onSubmit: function (ev) { ev.preventDefault(); scan(S.txt); } }, e('input', { className: 'lt2-input', placeholder: 'Scan or type a pack number (docket + 2-digit index)…', value: S.txt, onChange: function (ev) { up({ txt: ev.target.value }); } }), Btn('Scan', function () { scan(S.txt); }, 'primary', { sm: true })),
      list.length ? e('div', { className: 'lt2-row' }, chips, list.length > 12 ? e('span', { className: 'lt2-muted' }, '+' + (list.length - 12) + ' more') : null) : e('div', { className: 'lt2-muted' }, 'Nothing left to ' + mode + '.'),
      S.pend ? e('div', { className: 'lt2-banner', style: { background: '#fffbeb', color: '#92400e', flexWrap: 'wrap' } }, 'LIFO exception for ' + S.pend + ' — ', Sel(S.ovr, T.LIFO_OVERRIDES, function (v) { up({ ovr: v }); }, { style: { width: 'auto' } }), Btn('Override & load (logged)', function () { scan(S.pend, S.ovr); }, 'primary', { sm: true })) : null,
      e('div', { className: 'lt2-row' }, Btn(mode === 'unload' ? 'Scan all expected (demo)' : 'Scan all in LIFO order (demo)', function () { scanMany(list); }, 'ghost', { sm: true, disabled: !list.length }),
        mode === 'unload' ? [Btn('Simulate pack for a later stop', simAhead, 'ghost', { sm: true }), Btn('Simulate extra pack', simExtra, 'ghost', { sm: true })] : Btn('Simulate LIFO violation', simLifo, 'ghost', { sm: true, disabled: list.length < 2 })),
      S.feed.length ? e('div', { className: 'lt4-feed' }, S.feed.slice().reverse().map(function (f, i) { return e('div', { key: i, className: f.cls }, f.msg); })) : null);
  }

  function StopPanel(p) {
    var y = Y(), t = p.t, L = p.L, idx = p.idx, x = L.exec, s = x.stops[idx], steps = T.stepsFor(L, idx), last = idx === L.path.length - 1;
    var st = y.useState({ bay: 'Bay 2', sealIn: '', otl: '', digi: '', bin: 'Geo-cluster A · Bin 14', img: false, approve: false, msg: null }); var S = st[0]; function up(q) { st[1](Object.assign({}, S, q)); }
    var cur = steps.filter(function (k) { return !s.steps[k]; })[0];
    function done(k) { s.steps[k] = true; T.emit(); }
    var prev = idx > 0 ? x.stops[idx - 1] : null, prevSeal = prev && prev.seal;
    var panel = null;
    if (cur === 'arrive') {
      panel = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, ui.Two('Geo-fence IN', 'detected ' + (s.arrivedAt ? F.dt(s.arrivedAt) : 'at origin')), ui.Two('Scheduled arrival', s.schArr ? F.dt(s.schArr) : '—'),
        s.arrivedAt ? ui.Two('Arrival flag', T.otaFlag(s) === 'on-time' ? ui.Chip('on time (OTA)', 'green') : ui.Chip('delayed (+' + Math.round((s.arrivedAt - s.schArr) / 60000) + ' min)', 'amber')) : null,
        e('div', null, Btn('Confirm Gate In', function () { s.steps.arrive = true; if (last) L.arrival = L.arrival || { reachedAt: Date.now(), steps: {} }; x.log.push({ at: Date.now(), msg: 'Gate IN · ' + T.facLabel(L.path[idx]) }); T.emit(); }, 'primary')));
    } else if (cur === 'bay') {
      panel = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, Field('Bay (assignment)', Sel(S.bay, ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4', 'Bay 5'], function (v) { up({ bay: v }); })),
        idx > 0 ? e('div', null, ui.Two('Seal applied at ' + T.facShort(L.path[idx - 1]), prevSeal ? 'OTL ' + prevSeal.otl + ' · DigiLock ' + prevSeal.digi : '—'), Field('Seal number observed at arrival', e('input', { className: 'lt2-input', value: S.sealIn, placeholder: prevSeal ? prevSeal.otl : '', onChange: function (ev) { up({ sealIn: ev.target.value }); } })),
          S.sealIn && prevSeal && S.sealIn !== prevSeal.otl ? e('div', { className: 'lt2-banner', style: { background: '#fef2f2', color: '#b91c1c' } }, 'Seal mismatch — raise a DEPS incident before opening the vehicle.') : null) : null,
        Btn(idx > 0 ? 'Verify seal & unlock (DigiLock OTP)' : 'Bay In', function () { s.bay = S.bay; s.sealOk = !(prevSeal && S.sealIn && S.sealIn !== prevSeal.otl); done('bay'); }, 'primary', { disabled: idx > 0 && prevSeal && S.sealIn !== prevSeal.otl }));
    } else if (cur === 'unload') {
      panel = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, e(ScanConsole, { t: t, L: L, idx: idx, mode: 'unload' }),
        e('div', { className: 'lt2-row', style: { justifyContent: 'flex-end' } }, Btn('Done unloading' + (T.expectedUnload(L, idx).length ? ' (' + T.expectedUnload(L, idx).length + ' not scanned → short)' : ''), function () { T.expectedUnload(L, idx).forEach(function (pk) { if (!s.shorts.some(function (q) { return q.pack === pk; })) s.shorts.push({ pack: pk, status: 'short', at: Date.now() }); }); done('unload'); }, 'primary')));
    } else if (cur === 'reconcile') {
      var open = s.shorts.filter(function (q) { return q.status === 'short'; });
      panel = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
        e('div', { className: 'lt4-grid lt4-g3' }, [ui.Kpi('Unloaded', String(s.unloaded.length), 'packs', 'good'), ui.Kpi('Short', String(s.shorts.length), open.length + ' unresolved', s.shorts.length ? 'bad' : ''), ui.Kpi('Extra / missed', String(s.extras.length), 'recorded', s.extras.length ? 'warn' : '')].map(function (k, i) { return e('div', { key: i }, k); })),
        s.shorts.length ? e('div', { className: 'lt4-tbl-wrap', style: { maxHeight: 190, overflowY: 'auto' } }, e('table', { className: 'lt2-table' }, Th(['Short pack', 'Docket', 'Status', '']), e('tbody', null, s.shorts.slice(0, 30).map(function (q) { var d = T.docketByPack(q.pack); return e('tr', { key: q.pack }, e('td', null, q.pack), e('td', null, d ? d.client : '—'), e('td', null, q.status === 'short' ? ui.Chip('short — unresolved', 'red') : ui.Chip(q.status === 'found-later' ? 'found / search closed' : 'declared short', q.status === 'declared' ? 'amber' : 'green')), e('td', null, q.status === 'short' ? e('div', { className: 'lt2-row' }, Btn('Found in vehicle', function () { T.declareShort(L, idx, q.pack, true); var pk = q.pack; x.onboard.indexOf(pk) < 0 && x.onboard.push(pk); T.scanUnload(L, idx, pk); T.emit(); }, 'ghost', { sm: true }), Btn('Declare short', function () { q.status = 'declared'; x.log.push({ at: Date.now(), msg: 'Short alert sent to previous & forward locations · ' + q.pack }); T.emit(); }, 'ghost', { sm: true })) : null)); })))) : null,
        s.extras.length ? e('div', { className: 'lt4-note' }, s.extras.length + ' extra / missed pack(s) recorded: ' + s.extras.slice(0, 4).map(function (q) { return q.pack + ' (' + q.kind + ')'; }).join(', ') + (s.extras.length > 4 ? '…' : '') + '. Trip extras are unloaded here; packs for later stops stay on board.') : null,
        s.shorts.some(function (q) { return q.status === 'declared'; }) ? e('div', { className: 'lt4-note' }, 'Short alerts have gone to every previous and forward location. If the pack turns up at the next pit-stop it is unloaded there.') : null,
        e('div', { className: 'lt2-row', style: { justifyContent: 'flex-end' } }, Btn('Close reconciliation', function () { s.shorts.forEach(function (q) { if (q.status === 'short') q.status = 'declared'; }); done('reconcile'); }, 'primary', { disabled: false })));
    } else if (cur === 'putaway') {
      panel = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, Field('Put-away by BIN (geo-cluster / hub / mini-hub)', Sel(S.bin, ['Geo-cluster A · Bin 14', 'Geo-cluster B · Bin 03', 'Hub pallet H-221', 'Mini-hub staging M-07'], function (v) { up({ bin: v }); }), s.unloaded.length + ' pack(s) from this stop'),
        e('label', { className: 'lt2-row', style: { fontSize: 12.5, fontWeight: 600 } }, e('input', { type: 'checkbox', checked: S.img, onChange: function (ev) { up({ img: ev.target.checked }); } }), 'Stacking-position image captured'), Btn('Confirm put-away', function () { s.bin = S.bin; done('putaway'); }, 'primary', { disabled: !S.img && s.unloaded.length > 0 }));
    } else if (cur === 'load') {
      var rem = T.packsToLoad(L, idx), cand = T.candidatesToLoad(L, idx);
      panel = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, cand.length ? e(ScanConsole, { t: t, L: L, idx: idx, mode: 'load' }) : e('div', { className: 'lt4-note' }, 'No manifested dockets load at this stop.'),
        s.overrides.length ? e('div', { className: 'lt4-note' }, s.overrides.length + ' LIFO override(s) logged with reasons.') : null,
        rem.length ? e('label', { className: 'lt2-row', style: { fontSize: 12.5, fontWeight: 600, color: '#92400e' } }, e('input', { type: 'checkbox', checked: S.approve, onChange: function (ev) { up({ approve: ev.target.checked }); } }), 'Approve transport of ' + rem.length + ' partly-loaded pack(s) (docket continues with the packs that were scanned)') : null,
        e('div', { className: 'lt2-row', style: { justifyContent: 'flex-end' } }, Btn('Close loading', function () { if (rem.length) s.partApprovals = rem.slice(); done('load'); }, 'primary', { disabled: rem.length > 0 && !S.approve })));
    } else if (cur === 'cewb') {
      var on = T.onboardDockets(L), onKg = on.reduce(function (a, d) { return a + d.actWt; }, 0);
      panel = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, ui.Two('Dockets on board (to continue)', on.length + ' · ' + Math.round(onKg) + ' kg'), ui.Two('Current CEWB', L.cewb ? L.cewb.no + ' · v' + L.cewb.version : '—'),
        e('div', { className: 'lt4-note' }, idx === 0 ? 'Origin: the CEWB generated in stage 4 is verified against the loaded packs — no change needed.' : 'After unloading / loading the on-board set changed: re-manifest the “docket → off-load location” combination and issue a new CEWB version (Part-B stays on the same vehicle).'),
        Btn(idx === 0 ? 'Verify tally vs CEWB' : 'Re-manifest & update CEWB', function () { if (idx > 0) T.generateCEWB(t, L, 'Re-manifest at ' + T.facShort(L.path[idx]), on); done('cewb'); }, 'primary'));
    } else if (cur === 'seal') {
      panel = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, e('div', { className: 'lt2-grid-2' }, Field('Physical OTL seal no.', e('input', { className: 'lt2-input', value: S.otl, onChange: function (ev) { up({ otl: ev.target.value }); } })), Field('DigiLock ID', e('input', { className: 'lt2-input', value: S.digi, onChange: function (ev) { up({ digi: ev.target.value }); } }))),
        e('div', { className: 'lt4-note' }, 'Vehicle is locked for further loading except at remaining pit-stops. The next stop will check this seal on arrival.'), Btn('Lock & seal', function () { s.seal = { otl: S.otl, digi: S.digi }; done('seal'); }, 'primary', { disabled: !S.otl || !S.digi }));
    } else if (cur === 'depart') {
      panel = e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, ui.Two('On board', T.onboardDockets(L).length + ' dockets · ' + x.onboard.length + ' packs'), ui.Two('Next stop', T.facLabel(L.path[idx + 1]) + ' · ' + T.pathKm(L.path.slice(idx, idx + 2)) + ' km'), Btn('Bay Out · Gate Out · Geo-fence Out', function () { s.steps.depart = true; T.departStop(t, L, idx); T.emit(); }, 'primary'));
    } else {
      panel = last ? e('div', { className: 'lt4-note' }, 'All unloading steps at the final hub are done.') : e('div', { className: 'lt4-note' }, 'Stop complete.');
    }
    return e('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
      e('div', { className: 'lt4-steps' }, steps.map(function (k) { return e('div', { key: k, className: 'lt4-step' + (s.steps[k] ? ' done' : (k === cur ? ' cur' : '')) }, (s.steps[k] ? '✓ ' : '') + T.STEP_LABEL[k]); })), panel);
  }

  function pathWithStatus(t, L) {
    var x = L.exec;
    return ui.Path(L.path, { cur: x.phase === 'enroute' ? x.idx + 0.5 : x.idx, sub: function (i) { var s = x.stops[i]; if (!s) return 'ETA ' + F.dt(T.schedule(L.path, L.departTs)[i].arr); return s.departedAt ? 'left ' + F.dt(s.departedAt) : (i === x.idx && x.phase !== 'enroute' ? 'here now' : (s.arrivedAt ? 'arr ' + F.dt(s.arrivedAt) : 'origin')); } });
  }
  function tally(L) {
    var x = L.exec, ds = T.onboardDockets(L), kg = 0; x.onboard.forEach(function (pk) { var d = T.docketByPack(pk); if (d) kg += d.actWt / d.packs; });
    return { dockets: ds.length, packs: x.onboard.length, kg: kg };
  }

  // =====================================================================================================
  // Multi-stop Scan → Descan
  // =====================================================================================================
  export const ScanDescan = function () {
    var y = Y(); T.useStore();
    var t = T.pickTrip(function (x) { return !!T.cur(x).cewb && !(T.cur(x).arrival && T.cur(x).arrival.reachedAt); }) || T.pickTrip(function (x) { return !!T.cur(x).cewb; }) || T.pickTrip();
    var st = y.useState({ msg: null }); var S = st[0];
    if (!t) return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' }, ui.Header('Multi-stop Scan → Descan', 'No trips.'), ui.Empty('Plan a trip first.'));
    T.applyCtx(t);
    var L = T.cur(t), head = [ui.Header('Multi-stop · Scan → Descan', 'At every hub / mini-hub on the route: gate-in, seal check, unload scan, short / extra, put-away, LIFO load scan, CEWB re-manifest, lock, gate-out.'), ui.StageBar(t, 5), e('div', { className: 'lt2-row', style: { justifyContent: 'space-between' } }, ui.TripPicker(t), t.leg.ret ? legTabs(t, t.activeDir, function (d) { t.activeDir = d; T.emit(); }) : null)];
    if (!L.cewb) return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' }, head, e('div', { className: 'lt2-banner', style: { background: '#fffbeb', color: '#92400e' } }, 'Loading scans start after the CEWB is generated.  ', Btn('Go to CEWB →', function () { T.go('/trip-ops/cewb', t.id); }, 'primary', { sm: true })));
    T.initExec(t, L);
    var x = L.exec, idx = x.idx, last = idx === L.path.length - 1, s = x.stops[idx], tl = tally(L), vt = T.vtype(t.vehicleType);
    var role = idx === 0 ? 'Origin' : (last ? 'Final destination' : 'Pit-stop');
    var enroute = x.phase === 'enroute';
    var nextIdx = idx + 1, nxt = enroute ? L.path[nextIdx] : null;
    function arrive() { T.arriveStop(t, L, nextIdx, false); x.stops[nextIdx].arrivedAt = Date.now(); T.emit(); }
    var main = enroute ? ui.Card('Enroute · ' + T.facShort(L.path[idx]) + ' → ' + T.facShort(nxt), ui.Chip('ETA ' + F.dt(T.schedule(L.path, L.departTs)[nextIdx].arr), 'blue'), e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
      ui.Two('Distance', T.legKm(L.path[idx], nxt) + ' km'), ui.Two('On board', tl.dockets + ' dockets · ' + tl.packs + ' packs · ' + Math.round(tl.kg) + ' kg'), e('div', { className: 'lt4-note' }, 'ETA advance notification goes to the next hub 2 hours before arrival. Use the button to simulate the geo-fence entry.'), Btn('Simulate arrival at ' + T.facShort(nxt) + ' (geo-fence IN)', arrive, 'primary')))
      : (last ? ui.Card('Reached final destination · ' + T.facShort(L.path[idx]), ui.Chip('stage 6', 'green'), e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, e('div', { className: 'lt4-note' }, 'The vehicle is at the final hub. Unloading, reconciliation, release of dockets & vehicle, and THC closure continue in Final Hub Arrival.'), Btn('Open Final Hub Arrival →', function () { T.go('/trip-ops/final-arrival', t.id); }, 'primary')))
        : ui.Card(role + ' · ' + T.facLabel(L.path[idx]) + ' · stop ' + (idx + 1) + ' of ' + L.path.length, ui.Chip(role, idx === 0 ? 'amber' : 'blue'), e(StopPanel, { key: t.id + ':' + L.dir + ':' + idx, t: t, L: L, idx: idx })));
    var log = ui.Card('Event log', null, e('div', { className: 'lt4-feed' }, x.log.slice().reverse().slice(0, 14).map(function (l, i) { return e('div', { key: i }, F.dt(l.at) + ' · ' + l.msg); })));
    return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' }, head,
      ui.Card(t.id + ' · ' + (L.dir === 'fwd' ? 'Forward' : 'Return') + ' leg · ' + t.vehicle.regNo, e('div', { className: 'lt2-row' }, ui.Chip(L.cewb.no + ' · v' + L.cewb.version, 'blue'), last || enroute ? null : null, !last ? Btn('Fast-forward to final hub (demo)', function () { T.fastForward(t, L); T.emit(); }, 'ghost', { sm: true }) : null), pathWithStatus(t, L)),
      e('div', { className: 'lt4-grid lt4-g21' }, main, e('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
        ui.Card('On board now', null, e('div', null, ui.Two('Dockets', tl.dockets), ui.Two('Packs', tl.packs), ui.Two('Weight', Math.round(tl.kg).toLocaleString('en-IN') + ' kg'), ui.Bar(tl.kg / vt.capKg * 100, Math.round(tl.kg / vt.capKg * 100) + '% of ' + vt.capKg.toLocaleString('en-IN') + ' kg payload'), ui.Two('CEWB', L.cewb.no + ' v' + L.cewb.version))), log)));
  };

  // =====================================================================================================
  // Final Hub Arrival
  // =====================================================================================================
  export const Arrival = function () {
    var y = Y(); T.useStore();
    var t = T.pickTrip(function (x) { var l = T.cur(x); return l.arrival && l.arrival.reachedAt && !l.closure; }) || T.pickTrip(function (x) { var l = T.cur(x); return l.exec && l.exec.started; }) || T.pickTrip();
    var st = y.useState({ toll: '', recov: '', det: '', dmgPk: '', dmgNote: '', msg: null, odo: false, drv: false }); var S = st[0]; function up(q) { st[1](Object.assign({}, S, q)); }
    if (!t) return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' }, ui.Header('Final Hub Arrival', 'No trips.'), ui.Empty('Plan a trip first.'));
    T.applyCtx(t);
    var L = T.cur(t), head = [ui.Header('Reached at final destination hub', 'Unload, reconcile short / extra / damage, release dockets and vehicle, close the THC.'), ui.StageBar(t, 6), ui.TripPicker(t)];
    if (!L.exec || !L.exec.started) return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' }, head, e('div', { className: 'lt2-banner', style: { background: '#fffbeb', color: '#92400e' } }, t.id + ' has not left the origin yet.  ', Btn('Go to Scan → Descan →', function () { T.go('/trip-ops/scan-descan', t.id); }, 'primary', { sm: true })));
    var x = L.exec, lastIdx = L.path.length - 1, atLast = x.idx === lastIdx && x.phase !== 'enroute';
    if (!atLast) return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' }, head, ui.Card('In transit', ui.Chip('stop ' + (x.idx + 1) + ' of ' + L.path.length, 'blue'), pathWithStatus(t, L)),
      e('div', { className: 'lt2-banner', style: { background: '#eff6ff', color: '#1d4ed8' } }, 'The vehicle has not reached ' + T.facLabel(L.path[lastIdx]) + ' yet.  ', Btn('Continue Scan → Descan', function () { T.go('/trip-ops/scan-descan', t.id); }, 'ghost', { sm: true }), Btn('Fast-forward to final hub (demo)', function () { T.fastForward(t, L); T.emit(); }, 'primary', { sm: true })));
    var s = x.stops[lastIdx], steps = T.stepsFor(L, lastIdx), unloadDone = steps.every(function (k) { return s.steps[k]; });
    var ds = T.legDockets(L).filter(function (d) { return d.dest === L.path[lastIdx]; });
    var manPk = ds.reduce(function (a, d) { return a + d.packs; }, 0), manKg = ds.reduce(function (a, d) { return a + d.actWt; }, 0);
    var allUnl = []; Object.keys(x.stops).forEach(function (k) { allUnl = allUnl.concat(x.stops[k].unloaded); });
    var finalPk = s.unloaded.filter(function (pk) { var d = T.docketByPack(pk); return d && d.dest === L.path[lastIdx]; }).length;
    var shorts = s.shorts.filter(function (q) { return q.status !== 'found-later'; }), extras = s.extras;
    s.damage = s.damage || [];
    var released = !!L.released, closed = !!L.closure, ticketed = !!L.depsRaised;
    var thcAmt = L.dir === 'fwd' ? (t.thc ? t.thc.amount : 0) : T.partnerCost({ vehicleType: t.vehicleType, sourcing: t.sourcing, km: T.pathKm(L.path), method: 'km', stops: L.path.length }).thc;
    var tollDefault = Math.round(T.pathKm(L.path) * T.PARTNER.tollPerKm), toll = S.toll !== '' ? Number(S.toll) : tollDefault;
    var ota = T.otaFlag(s) !== 'delayed', otaInc = ota ? T.PARTNER.otaIncentive : 0;
    var recov = Number(S.recov) || 0, det = Number(S.det) || 0, payable = thcAmt + toll + otaInc + det - recov;
    var eco = T.economics(t, L, thcAmt);
    function raise() {
      var n = 0; function tk(d, type, note) { var id = 'DEPS-' + (1100 + Math.floor(Math.random() * 800)); window.LT_DEPS_TICKETS = [{ id: id, awb: T.fmtDocket(d ? d.no : '—'), trip: t.id, type: type, status: 'Open', reportedBy: 'Hub supervisor · ' + T.facShort(L.path[lastIdx]), reportedAt: new Date().toISOString().slice(0, 10), valueAtRisk: d ? Math.round(d.invoice / d.packs) : 0, description: note }].concat(window.LT_DEPS_TICKETS || []); n++; }
      shorts.forEach(function (q) { var d = T.docketByPack(q.pack); tk(d, 'Shortage', 'Pack ' + q.pack + ' not found at final-hub unload scan of ' + t.id + '.'); });
      extras.forEach(function (q) { var d = T.docketByPack(q.pack); tk(d, 'Excess', 'Pack ' + q.pack + ' scanned at ' + T.facShort(L.path[lastIdx]) + ' but not on the ' + t.id + ' manifest (' + q.kind + ').'); });
      s.damage.forEach(function (q) { var d = T.docketByPack(q.pack); tk(d, 'Damage', q.note || 'Damage registered at unloading.'); });
      L.depsRaised = n; T.emit(); up({ msg: n + ' DEPS ticket(s) raised — see DEPS Module › Tickets' });
    }
    function release() {
      T.legDockets(L).forEach(function (d) { if (d.dest === L.path[lastIdx]) { d.status = 'Reached destination hub'; d.loc = L.path[lastIdx]; } });
      if (L.cewb) L.cewb.status = 'Closed'; var v = T.vehicleById(t.vehicle.id); if (v) { v.status = 'Available'; v.loc = L.path[lastIdx]; }
      L.released = { at: Date.now() }; T.emit(); up({ msg: 'Dockets released from CEWB / manifest lock · vehicle released from TC & THC and free for loading at ' + T.facShort(L.path[lastIdx]) });
    }
    function closeThc() {
      var tot = T.legTotals(L), sc = T.schedule(L.path, L.departTs), dep = x.stops[0].departedAt || L.departTs, arr = s.arrivedAt || Date.now();
      var floorH = 0; L.path.forEach(function (c, i) { var q = x.stops[i]; if (q && q.arrivedAt && q.departedAt) floorH += (q.departedAt - q.arrivedAt) / 3600000; else if (i > 0 && i < lastIdx) floorH += T.DWELL_H; });
      var tripH = (arr - dep) / 3600000, hwH = Math.max(0, tripH - floorH), otd = 100, otaN = 0, otaT = 0; Object.keys(x.stops).forEach(function (k) { var f = T.otaFlag(x.stops[k]); if (f !== 'na') { otaT++; if (f === 'on-time') otaN++; } });
      L.closure = { at: Date.now(), thc: thcAmt, toll: toll, otaInc: otaInc, det: det, recov: recov, payable: payable, payRef: 'PAY-' + F.pad(T.hash(t.id + L.dir) % 1000000, 6), tripH: tripH, floorH: floorH, hwH: hwH, ota: otaT ? Math.round(otaN / otaT * 100) : 100, kpi: { revenue: eco.revenue, contribution: eco.revenue - payable + 0, costPerKm: payable / (eco.km || 1), costPerKg: tot.act ? payable / tot.act : 0, costPerTonKm: eco.tripTonKm ? payable / eco.tripTonKm : 0, util: eco.capUtil } };
      if (t.thc && L.dir === 'fwd') t.thc.status = 'Closed'; T.emit(); up({ msg: 'THC closed — payable ' + inr(payable) });
    }
    function startReturn() { t.activeDir = 'ret'; T.emit(); T.go('/trip-ops/manifest', t.id); }

    var tallyCard = ui.Card('Unloading tally · ' + T.facLabel(L.path[lastIdx]), ui.Chip(unloadDone ? 'unloading complete' : 'in progress', unloadDone ? 'green' : 'amber'), e('div', null,
      e('div', { className: 'lt4-grid lt4-g4' }, [ui.Kpi('Manifested for this hub', manPk + ' packs', ds.length + ' dockets · ' + Math.round(manKg) + ' kg'), ui.Kpi('Unloaded', String(finalPk), 'packs scanned', finalPk === manPk ? 'good' : ''), ui.Kpi('Short', String(shorts.length), 'packs', shorts.length ? 'bad' : 'good'), ui.Kpi('Extra / damaged', extras.length + ' / ' + s.damage.length, 'packs', extras.length || s.damage.length ? 'warn' : 'good')].map(function (k, i) { return e('div', { key: i }, k); })),
      unloadDone ? null : e('div', { style: { marginTop: 14 } }, e(StopPanel, { key: t.id + ':' + L.dir + ':final', t: t, L: L, idx: lastIdx }))));
    var dmg = unloadDone && !released ? ui.Card('Damage registration', null, e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, e('div', { className: 'lt2-grid-2' }, Field('Pack', Sel(S.dmgPk, [{ v: '', l: 'Select unloaded pack…' }].concat(s.unloaded.slice(0, 80).map(function (pk) { return { v: pk, l: pk }; })), function (v) { up({ dmgPk: v }); })), Field('Remark', e('input', { className: 'lt2-input', value: S.dmgNote, placeholder: 'e.g. crushed corner, wet carton', onChange: function (ev) { up({ dmgNote: ev.target.value }); } }))),
      e('div', { className: 'lt2-row' }, Btn('Register damage', function () { s.damage.push({ pack: S.dmgPk, note: S.dmgNote || 'Damage registered at unloading.' }); up({ dmgPk: '', dmgNote: '' }); T.emit(); }, 'ghost', { sm: true, disabled: !S.dmgPk }), s.damage.length ? ui.Chip(s.damage.length + ' registered', 'amber') : null))) : null;
    var step3 = unloadDone ? ui.Card('Close-out', closed ? ui.Chip('trip closed', 'green') : (released ? ui.Chip('released', 'green') : ui.Chip('pending', 'amber')), e('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      e('div', { className: 'lt2-row' }, Btn(ticketed ? '✓ ' + L.depsRaised + ' DEPS ticket(s) raised' : 'Raise DEPS tickets (' + (shorts.length + extras.length + s.damage.length) + ')', raise, 'ghost', { sm: true, disabled: ticketed || !(shorts.length + extras.length + s.damage.length) }), Btn(released ? '✓ Released' : 'Release dockets & vehicle', release, 'primary', { sm: true, disabled: released }),
        e('span', { className: 'lt2-muted' }, 'Releases dockets from the CEWB / manifest lock and frees the vehicle from TC & THC (current location = trip destination).')),
      released ? e('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } }, e('div', { className: 'lt4-grid lt4-g3' }, Field('Toll at actuals (₹)', e('input', { type: 'number', className: 'lt2-input', value: S.toll !== '' ? S.toll : tollDefault, disabled: closed, onChange: function (ev) { up({ toll: ev.target.value }); } })), Field('Detention / other (₹)', e('input', { type: 'number', className: 'lt2-input', value: S.det, disabled: closed, onChange: function (ev) { up({ det: ev.target.value }); } })), Field('Recovery — short / damage (₹)', e('input', { type: 'number', className: 'lt2-input', value: S.recov, disabled: closed, onChange: function (ev) { up({ recov: ev.target.value }); } }))),
        ui.Two('THC amount', inr(thcAmt)), ui.Two('+ Toll reimbursement', inr(toll)), ui.Two('+ Driver OTA incentive', ota ? inr(otaInc) : '— (arrived late)'), ui.Two('+ Detention / other', inr(det)), ui.Two('− Recovery', inr(recov)), ui.Two('THC payable', inr(payable), true),
        e('div', { className: 'lt2-row' }, e('label', { className: 'lt2-row', style: { fontSize: 12.5, fontWeight: 600 } }, e('input', { type: 'checkbox', checked: S.odo, disabled: closed, onChange: function (ev) { up({ odo: ev.target.checked }); } }), 'Trip distance confirmed (route master / VTS / odometer)'), e('label', { className: 'lt2-row', style: { fontSize: 12.5, fontWeight: 600 } }, e('input', { type: 'checkbox', checked: S.drv, disabled: closed, onChange: function (ev) { up({ drv: ev.target.checked }); } }), 'Driver payment reference issued')),
        e('div', { className: 'lt2-row', style: { justifyContent: 'flex-end' } }, Btn(closed ? '✓ THC closed' : 'Close THC & trip', closeThc, 'primary', { disabled: closed || !S.odo || !S.drv }))) : null)) : null;
    var sumCard = closed ? ui.Card('Trip summary', ui.Chip(L.closure.payRef, 'blue'), e('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } }, e('div', { className: 'lt4-grid lt4-g4' }, [
      ui.Kpi('Trip time', F.hrs(L.closure.tripH), 'floor ' + F.hrs(L.closure.floorH) + ' · highway ' + F.hrs(L.closure.hwH)), ui.Kpi('OTA %', L.closure.ota + '%', 'stops reached on time', L.closure.ota >= 80 ? 'good' : 'warn'), ui.Kpi('Cost / km', inr(L.closure.kpi.costPerKm), inr(L.closure.payable) + ' payable'), ui.Kpi('Cost / ton-km', '₹' + L.closure.kpi.costPerTonKm.toFixed(2), 'cost / kg ₹' + L.closure.kpi.costPerKg.toFixed(2)),
      ui.Kpi('Freight revenue', inr(L.closure.kpi.revenue), 'pre-GST'), ui.Kpi('Contribution', inr(L.closure.kpi.contribution), 'revenue − THC payable', L.closure.kpi.contribution >= 0 ? 'good' : 'bad'), ui.Kpi('Cap util', Math.round(L.closure.kpi.util * 100) + '%', 'ton-km basis'), ui.Kpi('Payment ref', L.closure.payRef, 'driver payment')].map(function (k, i) { return e('div', { key: i }, k); })),
      e('div', { className: 'lt2-row', style: { justifyContent: 'flex-end' } }, t.leg.ret && !t.leg.ret.closure && t.activeDir === 'fwd' ? Btn('Start return leg ' + T.facShort(t.leg.ret.path[0]) + ' → ' + T.facShort(t.leg.ret.path[t.leg.ret.path.length - 1]) + ' (' + t.leg.ret.manifest.length + ' dockets) →', startReturn, 'primary') : e('span', { className: 'lt2-muted' }, 'Next in the chain: delivery run-sheet planning (outside 1A / 1B).')))) : null;

    return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' }, head, S.msg ? e('div', { className: 'lt2-banner success' }, S.msg) : null,
      ui.Card(t.id + ' · ' + (L.dir === 'fwd' ? 'Forward' : 'Return') + ' leg', ui.Chip(closed ? 'closed' : 'at ' + T.facShort(L.path[lastIdx]), closed ? 'green' : 'amber'), pathWithStatus(t, L)),
      tallyCard, dmg, step3, sumCard);
  };
