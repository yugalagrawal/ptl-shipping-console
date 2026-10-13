import * as React from 'react'
import { T, ui } from './core.js'
import './map.js'


  
  var e = T.e, F = T.fmt, inr = F.inr;
  function Y() { return React; }
  function Field(label, node, hint) { return e('div', { className: 'lt2-field' }, e('label', { className: 'lt2-label' }, label), node, hint ? e('span', { className: 'lt2-muted' }, hint) : null); }
  function Sel(value, opts, onChange, props) {
    return e('select', Object.assign({ className: 'lt2-select', value: value, onChange: function (ev) { onChange(ev.target.value); } }, props || {}),
      opts.map(function (o) { var v = typeof o === 'object' ? o.v : o, l = typeof o === 'object' ? o.l : o; return e('option', { key: v, value: v }, l); }));
  }
  function Btn(label, onClick, kind, o) { o = o || {}; return e('button', { type: 'button', className: 'lt2-btn ' + (kind || 'ghost') + (o.sm ? ' sm' : ''), onClick: onClick, disabled: !!o.disabled, title: o.title || null }, label); }
  function Th(arr) { return e('thead', null, e('tr', null, arr.map(function (h, i) { return e('th', { key: i, className: (typeof h === 'object' && h.num) ? 'lt4-num' : null }, typeof h === 'object' ? h.t : h); }))); }
  function toLocal(ts) { var d = new Date(ts), p = F.pad; return d.getFullYear() + '-' + p(d.getMonth() + 1, 2) + '-' + p(d.getDate(), 2) + 'T' + p(d.getHours(), 2) + ':' + p(d.getMinutes(), 2); }
  function stateChip(st, txt) { return ui.Chip(txt, st === 'ok' ? 'green' : (st === 'warn' ? 'amber' : 'red')); }
  T.ui2 = { Field: Field, Sel: Sel, Btn: Btn, Th: Th, toLocal: toLocal, stateChip: stateChip };

  // =====================================================================================================
  // Overview + 1B placeholders
  // =====================================================================================================
  export const Overview = function () {
    T.useStore();
    var counts = { 2: 0, 3: 0, 4: 0, 5: 0, 6: 0, 7: 0 };
    T.trips.forEach(function (t) { counts[T.stageOf(t)]++; });
    var next = { 2: '/trip-ops/vehicle-assign', 3: '/trip-ops/manifest', 4: '/trip-ops/cewb', 5: '/trip-ops/scan-descan', 6: '/trip-ops/final-arrival', 7: '/trip-ops/final-arrival' };
    var nextLbl = { 2: 'Assign vehicle', 3: 'Build manifest', 4: 'Generate CEWB', 5: 'Scan → Descan', 6: 'Arrive & close', 7: 'View' };
    var stock = {}; T.dockets.forEach(function (d) { if (d.status === 'At hub') { var s = stock[d.loc] = stock[d.loc] || { n: 0, packs: 0, wt: 0 }; s.n++; s.packs += d.packs; s.wt += d.actWt; } });
    var hubs = Object.keys(stock).sort(function (a, b) { return stock[b].wt - stock[a].wt; });
    return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' },
      e('div', { className: 'lt2-row', style: { justifyContent: 'space-between' } }, ui.Header('Trip Ops · 1A', 'Hub-to-hub line-haul — route & pricing, vehicle, manifest, CEWB, multi-stop scan-to-descan, arrival.'), Btn('+ Plan new trip', function () { T.go('/trip-ops/route-pricing'); }, 'primary')),
      ui.StageBar(null, 0),
      e('div', { className: 'lt4-grid lt4-g4' }, [
        ui.Kpi('Awaiting vehicle', String(counts[2]), 'route planned'), ui.Kpi('Manifest / CEWB', String(counts[3] + counts[4]), 'vehicle assigned → CEWB'),
        ui.Kpi('In transit', String(counts[5]), 'multi-stop scan-to-descan', 'warn'), ui.Kpi('Reached / closed', String(counts[6] + counts[7]), 'final hub arrival', 'good')].map(function (k, i) { return e('div', { key: i }, k); })),
      ui.Card('Trips', null, e('div', { className: 'lt4-tbl-wrap' }, e('table', { className: 'lt2-table' }, Th(['Trip', 'Route', 'Vehicle · THC', 'Dockets / packs', 'Load vs payload', 'Stage', '']),
        e('tbody', null, T.trips.map(function (t) {
          var L = T.cur(t), tot = T.legTotals(L), vt = T.vtype(t.vehicleType), util = vt.capKg ? tot.act / vt.capKg * 100 : 0, st = T.stageOf(t);
          return e('tr', { key: t.id },
            e('td', null, e('b', null, t.id), e('div', { className: 'lt2-muted' }, t.type + (t.twoWay ? ' · to-fro' : ''))),
            e('td', null, L.path.map(T.facShort).join(' → '), e('div', { className: 'lt2-muted' }, T.pathKm(L.path) + ' km · ' + (T.pathKm(L.path) > 600 ? 'Long haul' : 'Short haul'))),
            e('td', null, t.vehicle ? [e('span', { key: 'v' }, t.vehicle.regNo), e('div', { key: 'h', className: 'lt2-muted' }, t.thc.no + ' · ' + inr(t.thc.amount))] : e('span', { className: 'lt2-muted' }, 'not assigned')),
            e('td', null, tot.dockets + ' / ' + tot.packs),
            e('td', { style: { minWidth: 130 } }, ui.Bar(util, Math.round(tot.act) + ' / ' + vt.capKg + ' kg')),
            e('td', null, ui.Chip(T.stageLabel(t), st >= 6 ? 'green' : (st === 5 ? 'blue' : 'amber'))),
            e('td', null, Btn(nextLbl[st] + ' →', function () { T.go(next[st], t.id); }, 'ghost', { sm: true })));
        }))))),
      e('div', { className: 'lt4-grid lt4-g2' },
        ui.Card('Docket stock at hubs · hand-off from 1B', ui.Chip('seeded stand-in', 'ph', 'Real stock arrives from the 1B drop-scan at mini-hub / hub'), e('div', { className: 'lt4-tbl-wrap' }, e('table', { className: 'lt2-table' }, Th(['Hub', 'Dockets', 'Packs', { t: 'Weight (kg)', num: 1 }]),
          e('tbody', null, hubs.map(function (h) { return e('tr', { key: h }, e('td', null, T.facLabel(h)), e('td', null, stock[h].n), e('td', null, stock[h].packs), e('td', { className: 'lt4-num' }, Math.round(stock[h].wt).toLocaleString('en-IN'))); }))))),
        ui.Card('What 1A expects from 1B', null, e('div', { className: 'lt4-note' },
          e('p', { style: { margin: '0 0 8px' } }, 'Everything left of the dashed hand-off in the stage bar belongs to the teammate working on 1B. 1A picks up at one interface:'),
          e('p', { style: { margin: '0 0 6px' } }, e('b', null, 'Docket stock at a hub'), ' — each docket carries: 10-digit docket no. (+ check digit), pack numbers (docket + 2-digit index), client, current hub, destination hub, actual / volumetric weight, CFT, invoice value, risk, EWB no. + validity, status “At hub”.'),
          e('p', { style: { margin: 0 } }, 'When 1B’s “Drop scan at mini-hub” lands, it should write dockets into this stock; nothing in 1A changes.')))),
      ui.Card('1B · placeholders only (teammate)', ui.Chip('not built here', 'ph'), e('div', { className: 'lt4-grid lt4-g4' }, T.B1.map(function (b, i) {
        return e('div', { key: i, className: 'lt4-ph-card' }, e('b', null, (i + 1) + '. ' + b[0]), e('span', null, b[1]), e('div', null, ui.Chip('placeholder', 'ph')));
      }))));
  };

  // =====================================================================================================
  // Route & Pricing  (route design + client pricing (fetch client) + partner pricing)
  // =====================================================================================================
  function autoPick(path, vt) {
    var el = T.dockets.filter(function (d) { return d.status === 'At hub' && path.indexOf(d.loc) > -1 && path.indexOf(d.dest) > path.indexOf(d.loc); });
    el.sort(function (a, b) { return (b.prio === 'Priority') - (a.prio === 'Priority') || b.actWt - a.actWt; });
    var sel = {}, w = 0, c = 0;
    el.forEach(function (d) { if (w + d.actWt <= vt.capKg && c + d.cft <= vt.capCft) { sel[d.no] = true; w += d.actWt; c += d.cft; } });
    return sel;
  }
  function initState(t) {
    var path, origin, dest, depart, lane = null, type, two, vtp, src;
    if (t) { var L = t.leg.fwd; path = L.path.slice(); depart = L.departTs; type = t.type; two = t.twoWay; vtp = t.vehicleType; src = t.sourcing; lane = t.laneSno; }
    else { path = T.lanesFor('GGNT1', 'BOMT1')[0].path.slice(); depart = Math.ceil((T.NOW + 20 * 3600000) / 3600000) * 3600000; type = 'PitStop Circular'; two = true; vtp = T.VTYPES[3].type; src = 'Vendor'; lane = 1; }
    var vt = T.vtype(vtp);
    return { path: path, origin: path[0], dest: path[path.length - 1], lane: lane, depart: depart, type: type, two: two, vehicleType: vtp, sourcing: src, method: 'km', kmRate: '', tripRate: 85000, kgRate: 3.2, sel: autoPick(path, vt), addCode: '', useContract: true, client: 'All clients' };
  }
  export const RoutePricing = function () {
    var y = Y(); T.useStore();
    var urlTrip = T.hashParam('trip'), ex0 = urlTrip ? T.tripById(urlTrip) : null;
    var st = y.useState(function () { return { tripId: ex0 && T.stageOf(ex0) <= 2 ? ex0.id : 'NEW', S: initState(ex0 && T.stageOf(ex0) <= 2 ? ex0 : null), saved: null }; });
    var W = st[0]; var S = W.S;
    function setW(p) { st[1](Object.assign({}, W, p)); }
    function up(p) { var n = Object.assign({}, S, p); st[1](Object.assign({}, W, { S: n })); }
    T.useContract = S.useContract;
    var existing = W.tripId !== 'NEW' ? T.tripById(W.tripId) : null;
    var editable = T.trips.filter(function (t) { return T.stageOf(t) <= 2; });

    var vt = T.vtype(S.vehicleType), path = S.path, km = T.pathKm(path);
    var sch = T.schedule(path, S.depart), last = sch[sch.length - 1], transitH = (last.arr - S.depart) / 3600000;
    var lanes = T.lanesFor(S.origin, S.dest);
    var eligible = T.dockets.filter(function (d) { return d.status === 'At hub' && path.indexOf(d.loc) > -1 && path.indexOf(d.dest) > path.indexOf(d.loc); });
    var selDs = eligible.filter(function (d) { return S.sel[d.no]; });
    var tot = selDs.reduce(function (a, d) { a.act += d.actWt; a.chg += d.chargeWt; a.cft += d.cft; a.packs += d.packs; return a; }, { act: 0, chg: 0, cft: 0, packs: 0 });
    var pc = T.partnerCost({ vehicleType: S.vehicleType, sourcing: S.sourcing, km: km, method: S.method, kmRate: Number(S.kmRate) || 0, tripRate: S.tripRate, kgRate: S.kgRate, chargedKg: tot.chg, stops: path.length });
    var pseudo = { path: path, manifest: selDs.map(function (d) { return d.no; }) };
    var eco = T.economics({ vehicleType: S.vehicleType, thc: { amount: pc.thc } }, pseudo);
    var util = vt.capKg ? tot.act / vt.capKg * 100 : 0, utilV = vt.capCft ? tot.cft / vt.capCft * 100 : 0;
    var tolls = pc.tollReimb;

    function setPath(np) { var p = { path: np, origin: np[0], dest: np[np.length - 1] }; p.sel = autoPick(np, vt); up(p); }
    function onOD(o, d) {
      if (o === d) return;
      var ls = T.lanesFor(o, d), np = ls.length ? ls[0].path.slice() : [o, d];
      up({ origin: o, dest: d, path: np, lane: ls.length ? ls[0].lane.sno : null, two: ls.length ? ls[0].lane.dir === 'Round trip' : S.two, sel: autoPick(np, vt), type: ls.length ? (np.length > 2 ? (ls[0].lane.dir === 'Round trip' ? 'PitStop Circular' : 'PitStop 1Way') : (ls[0].lane.dir === 'Round trip' ? 'P2P 2Way' : 'P2P 1Way')) : 'Flexi Route' });
    }
    function toggle(no) { var s = Object.assign({}, S.sel); if (s[no]) delete s[no]; else s[no] = true; up({ sel: s }); }
    function selectAll(on) { var s = {}; if (on) eligible.forEach(function (d) { s[d.no] = true; }); up({ sel: s }); }
    function save() {
      var depart = S.depart, t;
      if (existing) {
        var L = existing.leg.fwd; L.path = path.slice(); L.departTs = depart; existing.type = S.type; existing.laneSno = S.lane; existing.vehicleType = S.vehicleType; existing.sourcing = S.sourcing;
        existing.twoWay = S.two; if (S.two && !existing.leg.ret) existing.leg.ret = { dir: 'ret', path: path.slice().reverse(), departTs: depart + (path.length * 6 + 10) * 3600000, manifest: [], locked: false, mnfNo: null, tcs: [], cewb: null, exec: null, arrival: null, closure: null, done: false };
        if (!S.two) delete existing.leg.ret; else existing.leg.ret.path = path.slice().reverse();
        t = existing;
      } else t = T.newTrip({ path: path, depart: depart, twoWay: S.two, laneSno: S.lane, type: S.type, sourcing: S.sourcing, vehicleType: S.vehicleType });
      t.pricing = { thc: pc.thc, toll: tolls, revenue: Math.round(eco.revenue), method: S.method, selection: Object.keys(S.sel), kmRate: Number(S.kmRate) || vt.perKm, useContract: S.useContract };
      T.sel = t.id; T.emit(); setW({ saved: t.id, tripId: t.id });
    }

    // ---------------- render
    var laneBtns = lanes.map(function (m) {
      var on = S.lane === m.lane.sno && S.path.join() === m.path.join();
      return e('button', { key: m.lane.sno, type: 'button', className: 'lt4-chip btn' + (on ? ' green' : ''), onClick: function () { up({ path: m.path.slice(), lane: m.lane.sno, sel: autoPick(m.path, vt), two: m.lane.dir === 'Round trip' }); }, title: m.lane.flags || '' }, 'Lane ' + m.lane.sno + ' · ' + m.path.map(T.facShort).join('→') + ' · ' + m.lane.dir + (m.reversed ? ' (reverse)' : ''));
    });
    laneBtns.push(e('button', { key: 'flexi', type: 'button', className: 'lt4-chip btn' + (S.lane == null ? ' green' : ''), onClick: function () { up({ lane: null, type: 'Flexi Route' }); } }, 'Flexi route (custom pitstops)'));
    var pitCount = path.length - 2;
    var addable = T.activeFac.filter(function (f) { return path.indexOf(f.code) < 0; });

    var routeCard = ui.Card('1 · Route design', ui.Chip(km > 600 ? 'Long haul > 600 km' : 'Short haul < 600 km', km > 600 ? 'blue' : 'green'), e('div', { className: 'lt4-grid lt4-g-map' }, e('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      e('div', { className: 'lt2-grid-2' },
        Field('Origin hub / mini-hub', Sel(S.origin, T.activeFac.map(function (f) { return { v: f.code, l: f.code + ' · ' + f.name + ' (' + f.tier + ')' }; }), function (v) { onOD(v, S.dest); })),
        Field('Destination hub / mini-hub', Sel(S.dest, T.activeFac.map(function (f) { return { v: f.code, l: f.code + ' · ' + f.name + ' (' + f.tier + ')' }; }), function (v) { onOD(S.origin, v); }))),
      Field('Network lanes that serve this pair', e('div', { className: 'lt2-row' }, laneBtns), lanes.length ? 'Lanes come from the Routes_Lanes sheet. Hubs on the lane become default pit-stops.' : 'No defined trunk lane between these two facilities — plan as a flexi route.'),
      e('div', null, e('div', { className: 'lt2-label', style: { marginBottom: 6 } }, 'Route path · ' + pitCount + ' pit-stop' + (pitCount === 1 ? '' : 's') + ' (max 6)'),
        ui.Path(path, { sub: function (i) { var s = sch[i]; return i === 0 ? 'dep ' + F.dt(s.dep) : 'arr ' + F.dt(s.arr); } }),
        e('div', { className: 'lt2-row', style: { marginTop: 10 } },
          Sel(S.addCode, [{ v: '', l: '+ Add a pit-stop…' }].concat(addable.map(function (f) { return { v: f.code, l: f.code + ' · ' + f.name }; })), function (v) { if (v && pitCount < 6) setPath(T.insertStop(path, v)); }, { style: { width: 'auto', minWidth: 230 }, disabled: pitCount >= 6 }),
          path.slice(1, -1).map(function (c) { return e('button', { key: c, type: 'button', className: 'lt4-chip btn', title: 'Remove pit-stop', onClick: function () { setPath(path.filter(function (x) { return x !== c; })); } }, T.facShort(c) + ' ✕'); }))),
      e('div', { className: 'lt2-grid-2' },
        Field('Trip type', Sel(S.type, ['P2P 1Way', 'P2P 2Way', 'PitStop 1Way', 'PitStop Circular', 'Flexi Route'], function (v) { up({ type: v, two: /2Way|Circular/.test(v) }); })),
        Field('Scheduled origin departure', e('input', { type: 'datetime-local', className: 'lt2-input', value: toLocal(S.depart), onChange: function (ev) { var ts = new Date(ev.target.value).getTime(); if (!isNaN(ts)) up({ depart: ts }); } }))),
      e('label', { className: 'lt2-row', style: { fontSize: 12.5, fontWeight: 600, color: '#334155' } }, e('input', { type: 'checkbox', checked: S.two, onChange: function (ev) { up({ two: ev.target.checked }); } }), 'To-fro: also plan the return leg ' + T.facShort(S.dest) + ' → ' + T.facShort(S.origin) + ' (manifested in stage 3)'),
      e('div', { className: 'lt4-grid lt4-g4' }, [ui.Kpi('Trip distance', km + ' km', 'indicative road km'), ui.Kpi('Transit time', F.hrs(transitH), 'at ' + T.SPEED_KMPH + ' km/h + ' + T.DWELL_H + 'h per pit-stop'), ui.Kpi('Arrival at ' + T.facShort(S.dest), F.dt(last.arr), 'scheduled'), ui.Kpi('Touch points', String(path.length), 'origin + ' + pitCount + ' + destination')].map(function (k, i) { return e('div', { key: i }, k); }))), e('div', { style: { position: 'sticky', top: 12 } }, e(ui.RouteMap, { path: path, twoWay: S.two, schedule: sch, onToggle: function (c) { if (path.indexOf(c) >= 0) { if (c !== path[0] && c !== path[path.length - 1]) setPath(path.filter(function (x) { return x !== c; })); } else if (pitCount < 6) setPath(T.insertStop(path, c)); } }))));

    // client pricing
    var fr = selDs.map(function (d) { return { d: d, f: T.docketFreight(d) }; });
    var sumPre = fr.reduce(function (s, r) { return s + r.f.pre; }, 0), sumGst = fr.reduce(function (s, r) { return s + r.f.gst; }, 0);
    var shown = eligible.slice(0, 60);
    var clientCard = ui.Card('2 · Client pricing estimate (fetch client)', e('div', { className: 'lt2-row' }, ui.Chip(selDs.length + ' of ' + eligible.length + ' dockets', 'blue'), Btn('All', function () { selectAll(true); }, 'ghost', { sm: true }), Btn('None', function () { selectAll(false); }, 'ghost', { sm: true }), Btn('Auto-fill to payload', function () { up({ sel: autoPick(path, vt) }); }, 'ghost', { sm: true })),
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        e('label', { className: 'lt2-row', style: { fontSize: 12.5, fontWeight: 600, color: '#334155' } }, e('input', { type: 'checkbox', checked: S.useContract, onChange: function (ev) { up({ useContract: ev.target.checked }); } }), 'Fetch each client’s contract rate (applies the client’s freight discount to the 13×13 rate card)'),
        e('div', { className: 'lt4-note' }, 'Rate = origin region → destination region ₹/kg from the standard rate card × chargeable weight (min ' + T.CLIENT_CFG.minDocketWt + ' kg), min ₹' + T.CLIENT_CFG.minDocketCharge + '/docket, + fixed ₹' + T.CLIENT_CFG.fixedDocketCharge + '/docket, + FSC ' + T.fscPct() + '%, + risk surcharge (owner ' + T.CLIENT_CFG.ownerRiskPct + '% / carrier ' + T.CLIENT_CFG.carrierRiskPct + '% of invoice). Charge heads are the defaults in the Customer Passport sheet; client discounts are illustrative.'),
        eligible.length === 0 ? ui.Empty('No docket stock at these hubs travels on this path.') : e('div', { className: 'lt4-tbl-wrap', style: { maxHeight: 340, overflowY: 'auto' } }, e('table', { className: 'lt2-table' },
          Th(['', 'Docket', 'Client', 'From → To', { t: 'Charged kg', num: 1 }, { t: '₹/kg', num: 1 }, { t: 'Freight (pre-GST)', num: 1 }]),
          e('tbody', null, shown.map(function (d) {
            var f = T.docketFreight(d), fo = T.fac(d.loc), fd = T.fac(d.dest);
            return e('tr', { key: d.no },
              e('td', null, e('input', { type: 'checkbox', checked: !!S.sel[d.no], onChange: function () { toggle(d.no); } })),
              e('td', null, T.fmtDocket(d.no), d.prio === 'Priority' ? e('span', { style: { marginLeft: 6 } }, ui.Chip('priority', 'amber')) : null),
              e('td', null, d.client, f.disc ? e('div', { className: 'lt2-muted' }, '−' + Math.round(f.disc * 100) + '% contract') : null),
              e('td', null, T.facShort(d.loc) + ' → ' + T.facShort(d.dest), e('div', { className: 'lt2-muted' }, fo.region + ' → ' + fd.region)),
              e('td', { className: 'lt4-num' }, Math.round(f.chargeWt)), e('td', { className: 'lt4-num' }, f.rate),
              e('td', { className: 'lt4-num' }, inr(f.pre), f.minApplied ? e('div', { className: 'lt2-muted' }, 'min charge') : null));
          }))),
        eligible.length > shown.length ? e('div', { className: 'lt2-muted' }, 'Showing first ' + shown.length + ' of ' + eligible.length + ' — use All / Auto-fill for the rest.') : null,
        e('div', { className: 'lt4-hr' }),
        ui.Two('Selected: ' + selDs.length + ' dockets · ' + tot.packs + ' packs · ' + Math.round(tot.act) + ' kg actual · ' + Math.round(tot.chg) + ' kg charged', ''),
        ui.Two('Freight revenue (pre-GST)', inr(sumPre)), ui.Two('GST @ ' + T.CLIENT_CFG.gst + '% (GTA road)', inr(sumGst)), ui.Two('Client billing (incl. GST)', inr(sumPre + sumGst), true))));

    // partner pricing
    var cmp = T.VTYPES.map(function (v) {
      var c = T.partnerCost({ vehicleType: v.type, sourcing: S.sourcing, km: km, method: S.method, kmRate: v === vt ? (Number(S.kmRate) || 0) : 0, tripRate: S.tripRate, kgRate: S.kgRate, chargedKg: tot.chg, stops: path.length });
      return { v: v, c: c, fits: tot.act <= v.capKg && tot.cft <= v.capCft, util: v.capKg ? tot.act / v.capKg * 100 : 0 };
    });
    var bestFit = cmp.filter(function (r) { return r.fits; })[0];
    var partnerCard = ui.Card('3 · Partner pricing (vehicle / THC)', ui.Chip(S.sourcing === 'Owned' ? 'owned fleet cost' : 'vendor trip-hire rate', 'blue'),
      e('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        e('div', { className: 'lt2-grid-2' },
          Field('Sourcing', e('div', { className: 'lt2-tabs' }, ['Vendor', 'Market', 'Owned'].map(function (x) { return e('button', { key: x, type: 'button', className: 'lt2-tab' + (S.sourcing === x ? ' active' : ''), onClick: function () { up({ sourcing: x }); } }, x === 'Market' ? 'Market (spot)' : (x === 'Vendor' ? 'Vendor (contract)' : 'Owned fleet')); }))),
          Field('Vehicle type', Sel(S.vehicleType, T.VTYPES.map(function (v) { return { v: v.type, l: v.type + ' · ' + v.capKg.toLocaleString('en-IN') + ' kg / ' + v.capCft + ' cft' }; }), function (v) { up({ vehicleType: v, sel: autoPick(path, T.vtype(v)) }); }))),
        S.sourcing !== 'Owned' ? e('div', { className: 'lt2-grid-3' },
          Field('Rate basis', Sel(S.method, [{ v: 'km', l: 'Per km (mid-mile default)' }, { v: 'trip', l: 'Per trip' }, { v: 'kg', l: 'Per kg' }], function (v) { up({ method: v }); })),
          S.method === 'km' ? Field('₹ / km', e('input', { type: 'number', className: 'lt2-input', value: S.kmRate, placeholder: String(vt.perKm), onChange: function (ev) { up({ kmRate: ev.target.value }); } }), 'blank = ' + vt.perKm + ' (seed)') : null,
          S.method === 'trip' ? Field('₹ / trip', e('input', { type: 'number', className: 'lt2-input', value: S.tripRate, onChange: function (ev) { up({ tripRate: ev.target.value }); } })) : null,
          S.method === 'kg' ? Field('₹ / kg', e('input', { type: 'number', step: '0.1', className: 'lt2-input', value: S.kgRate, onChange: function (ev) { up({ kgRate: ev.target.value }); } })) : null) : null,
        e('div', null, pc.lines.map(function (l, i) { return e('div', { key: i }, ui.Two(l[0], inr(l[1]))); }),
          ui.Two('THC amount (trip hire)', inr(pc.thc), true), ui.Two('Toll — reimbursable at actuals (' + T.PARTNER.tollPerKm + '/km est.)', inr(tolls))),
        e('div', { className: 'lt4-note' }, 'Vendor / market rates and owned-fleet cost parameters are ILLUSTRATIVE seeds (minimum billable ' + T.PARTNER.minKm + ' km). Methods mirror the Partner Pricing screen (per km / per trip / per kg); wire to the real partner rate cards when that module is merged.'),
        e('div', { className: 'lt4-tbl-wrap' }, e('table', { className: 'lt2-table' }, Th(['Vehicle', { t: 'THC', num: 1 }, { t: 'Load util', num: 1 }, { t: '₹ / kg', num: 1 }, 'Fit']),
          e('tbody', null, cmp.map(function (r) {
            return e('tr', { key: r.v.type, style: r.v === vt ? { background: '#fff7f3' } : null }, e('td', null, r.v.type, bestFit && bestFit.v === r.v ? e('span', { style: { marginLeft: 6 } }, ui.Chip('best fit', 'green')) : null),
              e('td', { className: 'lt4-num' }, inr(r.c.thc)), e('td', { className: 'lt4-num' }, Math.round(r.util) + '%'), e('td', { className: 'lt4-num' }, tot.act ? '₹' + (r.c.thc / tot.act).toFixed(1) : '—'), e('td', null, r.fits ? ui.Chip('fits', 'green') : ui.Chip('over', 'red')));
          }))))));

    // economics
    var contrib = eco.revenue - pc.thc;
    var ecoCard = ui.Card('4 · Trip economics', ui.Chip(contrib >= 0 ? 'contribution positive' : 'contribution negative', contrib >= 0 ? 'green' : 'red'), e('div', { style: { display: 'flex', flexDirection: 'column', gap: 14 } },
      e('div', { className: 'lt4-grid lt4-g4' }, [
        ui.Kpi('Freight revenue', inr(eco.revenue), 'pre-GST'), ui.Kpi('THC cost', inr(pc.thc), '+ ' + inr(tolls) + ' toll reimb.'),
        ui.Kpi('Contribution', inr(contrib), eco.revenue ? Math.round(contrib / eco.revenue * 100) + '% of revenue · cost ' + Math.round(eco.costPctRev) + '% of rev.' : '—', contrib >= 0 ? 'good' : 'bad'),
        ui.Kpi('Capacity util', Math.round(eco.capUtil * 100) + '%', 'ton-km carried / ton-km available', eco.capUtil < 0.6 ? 'warn' : 'good')].map(function (k, i) { return e('div', { key: i }, k); })),
      e('div', { className: 'lt4-grid lt4-g4' }, [
        ui.Kpi('Cost / km', inr(eco.costPerKm), km + ' km'), ui.Kpi('Cost / kg', tot.act ? '₹' + eco.costPerKg.toFixed(2) : '—', Math.round(tot.act) + ' kg actual'),
        ui.Kpi('Cost / ton-km', eco.tripTonKm ? '₹' + eco.thcPerTonKm.toFixed(2) : '—', 'payload ' + vt.capKg / 1000 + 'T × ' + km + ' km'), ui.Kpi('Weight / volume util', Math.round(util) + '% / ' + Math.round(utilV) + '%', Math.round(tot.act) + ' kg · ' + F.r1(tot.cft) + ' cft', util > 100 || utilV > 100 ? 'bad' : '')].map(function (k, i) { return e('div', { key: i }, k); })),
      e('div', { className: 'lt4-tbl-wrap' }, e('table', { className: 'lt2-table' }, Th(['Trip challan leg', { t: 'km', num: 1 }, { t: 'Dockets', num: 1 }, { t: 'Act. kg', num: 1 }, { t: 'Ton-km', num: 1 }, { t: 'Share of THC', num: 1 }, { t: '₹ / kg', num: 1 }]),
        e('tbody', null, eco.tcs.map(function (c) {
          return e('tr', { key: c.idx }, e('td', null, T.facShort(c.from) + ' → ' + T.facShort(c.to)), e('td', { className: 'lt4-num' }, c.km), e('td', { className: 'lt4-num' }, c.dockets), e('td', { className: 'lt4-num' }, Math.round(c.act)),
            e('td', { className: 'lt4-num' }, c.tonKm.toFixed(1)), e('td', { className: 'lt4-num' }, inr(c.share)), e('td', { className: 'lt4-num' }, c.act ? '₹' + c.perKg.toFixed(2) : '—'));
        })))),
      e('div', { className: 'lt4-note' }, 'TC share of THC = TC ton-km ÷ all TC ton-km × THC (Trip Passport). Revenue is allocated to each docket’s lane; a docket’s cost share inside a TC follows charged weight.')));

    var saved = W.saved ? T.tripById(W.saved) : null;
    var canSave = path.length >= 2 && S.origin !== S.dest && pitCount <= 6 && selDs.length > 0 && util <= 100 && utilV <= 100;
    return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' },
      ui.Header('Route & Pricing', 'Design the route, estimate what the client pays and what the partner costs — before a vehicle is assigned.'),
      ui.StageBar(existing || saved || null, 1),
      e('div', { className: 'lt4-sel' }, e('label', { className: 'lt2-label' }, 'Planning'),
        Sel(W.tripId, [{ v: 'NEW', l: '— New trip —' }].concat(editable.map(function (t) { return { v: t.id, l: t.id + ' · ' + T.cur(t).path.map(T.facShort).join(' → ') }; })), function (v) { var t = v === 'NEW' ? null : T.tripById(v); st[1]({ tripId: v, S: initState(t), saved: null }); }, { style: { width: 'auto', minWidth: 280 } })),
      saved ? e('div', { className: 'lt2-banner success' }, '✓ ' + saved.id + ' saved — THC estimate ' + inr(saved.pricing.thc) + '.  ', Btn('Next: assign vehicle →', function () { T.go('/trip-ops/vehicle-assign', saved.id); }, 'primary', { sm: true })) : null,
      routeCard, clientCard, partnerCard, ecoCard,
      e('div', { className: 'lt2-row', style: { justifyContent: 'flex-end' } },
        !canSave ? e('span', { className: 'lt2-muted' }, selDs.length === 0 ? 'Select at least one docket to price.' : (util > 100 || utilV > 100 ? 'Selected load exceeds the vehicle — pick a larger vehicle or untick dockets.' : 'Check origin / destination.')) : null,
        Btn(existing ? 'Update trip ' + existing.id : 'Save trip', save, 'primary', { disabled: !canSave })));
  };

  // =====================================================================================================
  // Vehicle Assign (+ driver validation, checklist QC, THC generation)
  // =====================================================================================================
  export const VehicleAssign = function () {
    var y = Y(); T.useStore();
    var t = T.pickTrip();
    var st = y.useState({ vid: null, d1: null, d2: '', face: {}, intimated: false, checks: {}, bay: 'Bay 3', thcAmt: '', zbm: false, tab: 'All', allHubs: false, msg: null });
    var S = st[0]; function up(p) { st[1](Object.assign({}, S, p)); }
    if (!t) return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' }, ui.Header('Vehicle Assign', 'No trips yet.'), ui.Empty('Plan a trip first.'));
    var L = T.cur(t), origin = L.path[0], km = T.pathKm(L.path), vt = T.vtype(t.vehicleType);
    var tot = T.legTotals(L), needKg = tot.act, needCft = tot.cft;
    if (!tot.dockets && t.pricing && t.pricing.selection) { t.pricing.selection.forEach(function (n) { var d = T.docketByNo(n); if (d) { needKg += d.actWt; needCft += d.cft; } }); }
    var assigned = !!(t.vehicle && t.thc);
    var cands = T.vehicles.filter(function (v) { return (v.status === 'Available' || (t.vehicle && v.id === t.vehicle.id)) && (S.allHubs || v.loc === origin) && (S.tab === 'All' || v.own === S.tab); });
    var vSel = T.vehicleById(S.vid || (assigned ? t.vehicle.id : null));
    var comp = vSel ? T.vehicleCompliance(vSel) : null;
    var vtSel = vSel ? T.vtype(vSel.type) : null;
    var fits = vSel ? (needKg <= vtSel.capKg && needCft <= vtSel.capCft) : true;
    var d1 = T.driverById(S.d1 || (vSel && vSel.driver)), d2 = S.d2 ? T.driverById(S.d2) : null;
    var licOk = d1 ? (d1.licExpiry - T.NOW) / 86400000 >= 7 : false;
    var faceOk = d1 ? (d1.face || S.face[d1.id]) : false;
    var checklist = ['Tyres & wheel nuts', 'Brakes & lights', 'Floor / body condition (no leaks)', 'Fire extinguisher + first-aid kit', 'GPS / VTS device working', 'Tarpaulin & lashing straps'];
    var needQC = vSel && vSel.newVeh;
    var qcOk = !needQC || checklist.every(function (c) { return S.checks[c]; });
    var pc = vSel ? T.partnerCost({ vehicleType: vSel.type, sourcing: vSel.own, km: km, method: 'km', kmRate: 0, chargedKg: tot.chg, stops: L.path.length }) : null;
    var vendorType = vSel ? (vSel.own === 'Market' ? 'MKT National' : (vSel.own === 'Owned' ? 'Owned fleet' : 'NVP')) : '';
    var thcAmt = S.thcAmt !== '' ? Number(S.thcAmt) : (pc ? pc.thc : 0);
    var needZbm = vSel && vSel.own === 'Market';
    var docBlock = comp && comp.state === 'block', docWarn = comp && comp.state === 'warn';
    var canGen = vSel && !docBlock && fits && d1 && licOk && faceOk && qcOk && (!docWarn || S.intimated) && (!needZbm || S.zbm) && thcAmt > 0;
    var why = !vSel ? 'Select a vehicle.' : docBlock ? 'A vehicle document expires within a week (or has expired) — vehicle is blocked.' : !fits ? 'Planned load does not fit this vehicle.' : !d1 ? 'Select a driver.' : !licOk ? 'Driving licence expired / expiring within a week.' : !faceOk ? 'Driver face verification pending.' : !qcOk ? 'Complete the new-vehicle checklist.' : (docWarn && !S.intimated) ? 'Confirm intimation to the vendor for expiring documents.' : (needZbm && !S.zbm) ? 'Market-vehicle THC needs ZBM approval.' : '';

    function generate() {
      var prev = t.vehicle ? T.vehicleById(t.vehicle.id) : null; if (prev) prev.status = 'Available';
      t.vehicle = { id: vSel.id, regNo: vSel.regNo, type: vSel.type, own: vSel.own, vendor: vSel.vendor, bay: S.bay };
      t.vehicleType = vSel.type; t.sourcing = vSel.own; t.driver1 = d1.id; t.driver2 = d2 ? d2.id : null;
      t.thc = { no: (t.thc ? t.thc.no : 'THC-' + T.THC_SEQ()), vendorType: vendorType, amount: thcAmt, status: 'Generated', at: Date.now(), approval: needZbm ? 'Approved by ZBM (OTP)' : null, toll: Math.round(km * T.PARTNER.tollPerKm) };
      vSel.status = 'Assigned'; if (L.cewb) { L.cewb.vehicle = vSel.regNo; L.cewb.history.push({ no: L.cewb.no, version: L.cewb.version, at: Date.now(), reason: 'Part-B vehicle updated → ' + vSel.regNo }); }
      T.emit(); up({ msg: t.thc.no });
    }
    function releaseVeh() { var prev = T.vehicleById(t.vehicle.id); if (prev) prev.status = 'Available'; t.vehicle = null; t.thc = null; t.driver1 = null; t.driver2 = null; T.emit(); up({ vid: null, msg: null }); }

    var list = ui.Card('Vehicles' + (S.allHubs ? ' · all hubs' : ' at ' + T.facShort(origin)), e('div', { className: 'lt2-row' },
      e('div', { className: 'lt2-tabs' }, ['All', 'Owned', 'Vendor', 'Market'].map(function (x) { return e('button', { key: x, type: 'button', className: 'lt2-tab' + (S.tab === x ? ' active' : ''), onClick: function () { up({ tab: x }); } }, x); })),
      e('label', { className: 'lt2-row', style: { fontSize: 12, fontWeight: 600, color: '#334155' } }, e('input', { type: 'checkbox', checked: S.allHubs, onChange: function (ev) { up({ allHubs: ev.target.checked }); } }), 'all hubs')),
      cands.length === 0 ? ui.Empty('No available vehicles here — tick “all hubs” or change the sourcing filter.') : e('div', { className: 'lt4-tbl-wrap' }, e('table', { className: 'lt2-table' }, Th(['Vehicle', 'Owner', 'Location', { t: 'Payload', num: 1 }, 'Fit', 'Docs', { t: 'THC est.', num: 1 }, '']),
        e('tbody', null, cands.map(function (v) {
          var c = T.vehicleCompliance(v), vv = T.vtype(v.type), f = needKg <= vv.capKg && needCft <= vv.capCft, est = T.partnerCost({ vehicleType: v.type, sourcing: v.own, km: km, method: 'km', stops: L.path.length }).thc;
          return e('tr', { key: v.id, style: vSel && vSel.id === v.id ? { background: '#fff7f3' } : null },
            e('td', null, e('b', null, v.regNo), e('div', { className: 'lt2-muted' }, v.type)), e('td', null, v.own, v.vendor ? e('div', { className: 'lt2-muted' }, v.vendor) : null), e('td', null, T.facShort(v.loc)),
            e('td', { className: 'lt4-num' }, vv.capKg.toLocaleString('en-IN') + ' kg'), e('td', null, f ? ui.Chip(needKg ? Math.round(needKg / vv.capKg * 100) + '% load' : 'fits', 'green') : ui.Chip('too small', 'red')),
            e('td', null, stateChip(c.state, c.state === 'ok' ? 'valid' : (c.state === 'warn' ? 'expiring' : 'blocked'))), e('td', { className: 'lt4-num' }, inr(est)),
            e('td', null, Btn(vSel && vSel.id === v.id ? 'Selected' : 'Select', function () { up({ vid: v.id, d1: null, d2: '', checks: {}, intimated: false, zbm: false, thcAmt: '', msg: null }); }, 'ghost', { sm: true })));
        })))));

    var right = !vSel ? ui.Card('Assignment', null, ui.Empty('Pick a vehicle from the list.')) : e('div', { style: { display: 'flex', flexDirection: 'column', gap: 16 } },
      ui.Card('Truck documents · ' + vSel.regNo, stateChip(comp.state, comp.state === 'ok' ? 'all valid' : (comp.state === 'warn' ? 'intimate vendor' : 'BLOCKED')), e('div', null,
        e('table', { className: 'lt2-table' }, e('tbody', null, comp.items.map(function (i) { return e('tr', { key: i.key }, e('td', null, i.label), e('td', null, F.d(i.expiry)), e('td', { className: 'lt4-num' }, i.days + ' d'), e('td', null, stateChip(i.state, i.state === 'ok' ? 'ok' : (i.state === 'warn' ? '< 1 month' : (i.days < 0 ? 'expired' : '< 1 week'))))); }))),
        e('div', { className: 'lt4-note', style: { marginTop: 8 } }, 'Rule from the Trip Passport: expiring within 1 month → intimate the vendor; within 1 week → vehicle is blocked.'),
        docWarn ? e('label', { className: 'lt2-row', style: { fontSize: 12.5, fontWeight: 600, marginTop: 8 } }, e('input', { type: 'checkbox', checked: S.intimated, onChange: function (ev) { up({ intimated: ev.target.checked }); } }), 'Vendor intimated about expiring documents') : null)),
      ui.Card('Driver', null, e('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        Field('Driver 1', Sel(d1 ? d1.id : '', [{ v: '', l: 'Select…' }].concat(T.drivers.map(function (d) { return { v: d.id, l: d.name }; })), function (v) { up({ d1: v }); })),
        d1 ? e('div', null, ui.Two('Licence ' + d1.licence, F.d(d1.licExpiry)), ui.Two('Licence validity', licOk ? ui.Chip('valid', 'green') : ui.Chip('expired / < 1 week', 'red')),
          ui.Two('Face verification', faceOk ? ui.Chip('verified', 'green') : Btn('Verify face (simulate)', function () { var f = Object.assign({}, S.face); f[d1.id] = true; up({ face: f }); }, 'ghost', { sm: true })),
          ui.Two('Suraksha Apathi', d1.suraksha ? ui.Chip('enrolled', 'green') : ui.Chip('not enrolled', 'amber')), ui.Two('Mobile', d1.mobile)) : null,
        Field('Driver 2 (optional)', Sel(S.d2, [{ v: '', l: 'None' }].concat(T.drivers.filter(function (d) { return !d1 || d.id !== d1.id; }).map(function (d) { return { v: d.id, l: d.name }; })), function (v) { up({ d2: v }); })))),
      needQC ? ui.Card('New-vehicle checklist QC', ui.Chip('first trip for this vehicle', 'amber'), e('div', { style: { display: 'flex', flexDirection: 'column', gap: 6 } }, checklist.map(function (c) { return e('label', { key: c, className: 'lt2-row', style: { fontSize: 12.5 } }, e('input', { type: 'checkbox', checked: !!S.checks[c], onChange: function (ev) { var k = Object.assign({}, S.checks); k[c] = ev.target.checked; up({ checks: k }); } }), c); }))) : null,
      ui.Card('Trip Hire Contract (THC)', ui.Chip(vendorType + ' flow', 'blue'), e('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
        e('div', { className: 'lt2-grid-2' }, Field('THC amount (₹)', e('input', { type: 'number', className: 'lt2-input', value: S.thcAmt !== '' ? S.thcAmt : (pc ? pc.thc : ''), onChange: function (ev) { up({ thcAmt: ev.target.value }); } }), 'default = partner price for ' + km + ' km'), Field('Bay (assignment)', Sel(S.bay, ['Bay 1', 'Bay 2', 'Bay 3', 'Bay 4', 'Bay 5', 'Bay 6'], function (v) { up({ bay: v }); }))),
        ui.Two('Vendor', vSel.vendor || 'LT owned fleet'), ui.Two('Trip', T.facShort(origin) + ' → ' + T.facShort(L.path[L.path.length - 1]) + ' · ' + km + ' km'),
        needZbm ? e('div', null, e('div', { className: 'lt4-note' }, 'Market vehicle (no contract) — THC needs ZBM approval by e-mail / SMS OTP / in-built app.'), S.zbm ? ui.Chip('ZBM approved (OTP)', 'green') : Btn('Request ZBM approval (simulate OTP)', function () { up({ zbm: true }); }, 'ghost', { sm: true })) : null,
        !fits ? e('div', { className: 'lt2-banner', style: { background: '#fef2f2', color: '#b91c1c' } }, 'Planned load ' + Math.round(needKg) + ' kg / ' + F.r1(needCft) + ' cft exceeds this vehicle (' + vtSel.capKg + ' kg / ' + vtSel.capCft + ' cft).') : null,
        why ? e('div', { className: 'lt2-muted' }, why) : null,
        e('div', { className: 'lt2-row', style: { justifyContent: 'flex-end' } }, Btn(assigned ? 'Re-assign vehicle & regenerate THC' : 'Assign vehicle & generate THC', generate, 'primary', { disabled: !canGen })))));

    return e('div', { className: 'lt4-wrap mx-auto max-w-6xl' },
      ui.Header('Vehicle Assign', 'Pick a compliant vehicle and driver, confirm the bay, and generate the Trip Hire Contract.'),
      ui.StageBar(t, 2), ui.TripPicker(t),
      ui.Card('Trip ' + t.id, ui.Chip(Math.round(needKg) + ' kg · ' + F.r1(needCft) + ' cft planned', 'blue'), ui.Path(L.path)),
      assigned ? e('div', { className: 'lt2-banner success' }, '✓ ' + t.thc.no + ' · ' + t.vehicle.regNo + ' (' + t.vehicle.type + ') · ' + T.driverById(t.driver1).name + ' · ' + inr(t.thc.amount) + ' · ' + t.thc.vendorType + (t.thc.approval ? ' · ' + t.thc.approval : '') + '   ',
        Btn('Next: manifest →', function () { T.go('/trip-ops/manifest', t.id); }, 'primary', { sm: true }), L.locked ? null : Btn('Release vehicle', releaseVeh, 'ghost', { sm: true })) : null,
      e('div', { className: 'lt4-grid lt4-gs' }, list, right));
  };
