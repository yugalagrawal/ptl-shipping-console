import * as React from 'react'
import './ops.css'

// Ported from PrototypeUserModule_v8a (Trip Ops 1A) — core: network data, seed, store, pricing, EWB, manifest and scan logic.

  
  var NET = {"fac": [{"code": "NOIT1", "name": "Noida", "city": "Noida", "tier": "Hub", "zone": "NOI", "sqft": 29000, "state": "Uttar Pradesh", "st": "UP", "region": "N1", "regionName": "North 1", "status": "CLOSED", "lat": 28.57, "lng": 77.32}, {"code": "BOMT1", "name": "Bhiwandi", "city": "Bhiwandi", "tier": "Hub", "zone": "BOM", "sqft": 15600, "state": "Maharashtra", "st": "MH", "region": "W1", "regionName": "West 1", "status": "Active", "lat": 19.3, "lng": 73.06}, {"code": "BLRT1", "name": "Bengaluru (Hoskote)", "city": "Hoskote", "tier": "Hub", "zone": "BLR", "sqft": 5986, "state": "Karnataka", "st": "KA", "region": "S1", "regionName": "South 1", "status": "Active", "lat": 13.07, "lng": 77.8}, {"code": "NGPT1", "name": "Nagpur", "city": "Nagpur", "tier": "Hub", "zone": "NGP", "sqft": 1500, "state": "Maharashtra", "st": "MH", "region": "W2", "regionName": "West 2", "status": "Active", "lat": 21.15, "lng": 79.09}, {"code": "LKOT1", "name": "Lucknow", "city": "Lucknow", "tier": "Hub", "zone": "LKO", "sqft": 6250, "state": "Uttar Pradesh", "st": "UP", "region": "N2", "regionName": "North 2", "status": "Active", "lat": 26.85, "lng": 80.95}, {"code": "HYDT1", "name": "Hyderabad", "city": "Hyderabad", "tier": "Hub", "zone": "HYD", "sqft": 4500, "state": "Telangana", "st": "TG", "region": "S1", "regionName": "South 1", "status": "Active", "lat": 17.39, "lng": 78.49}, {"code": "AGRB1", "name": "Agra", "city": "Agra", "tier": "Mini-Hub", "zone": "AGR", "sqft": 500, "state": "Uttar Pradesh", "st": "UP", "region": "N2", "regionName": "North 2", "status": "Active", "lat": 27.18, "lng": 78.02}, {"code": "VAPT1", "name": "Vapi", "city": "Vapi", "tier": "Hub", "zone": "VAP", "sqft": 1300, "state": "Gujarat", "st": "GJ", "region": "W2", "regionName": "West 2", "status": "Active", "lat": 20.37, "lng": 72.91}, {"code": "KOLT1", "name": "Kolkata", "city": "Kolkata", "tier": "Hub", "zone": "KOL", "sqft": 11800, "state": "West Bengal", "st": "WB", "region": "E1", "regionName": "East 1", "status": "Active", "lat": 22.57, "lng": 88.36}, {"code": "GWHT1", "name": "Guwahati", "city": "Guwahati", "tier": "Hub", "zone": "GWH", "sqft": 3800, "state": "Assam", "st": "AS", "region": "NE2", "regionName": "North East 2", "status": "Active", "lat": 26.14, "lng": 91.74}, {"code": "DBHT1", "name": "Chauparan (Hazaribagh)", "city": "Chauparan", "tier": "Hub", "zone": "DBH", "sqft": 1000, "state": "Jharkhand", "st": "JH", "region": "E1", "regionName": "East 1", "status": "Active", "lat": 24.4, "lng": 85.2}, {"code": "BLRT2", "name": "Bengaluru (Makali)", "city": "Makali", "tier": "Hub", "zone": "BLR", "sqft": 5000, "state": "Karnataka", "st": "KA", "region": "S1", "regionName": "South 1", "status": "Active", "lat": 13.07, "lng": 77.47}, {"code": "AMDT1", "name": "Ahmedabad", "city": "Ahmedabad", "tier": "Hub", "zone": "AMD", "sqft": 7700, "state": "Gujarat", "st": "GJ", "region": "W1", "regionName": "West 1", "status": "Active", "lat": 23.02, "lng": 72.57}, {"code": "ZRKT1", "name": "Zirakpur (Punjab)", "city": "Zirakpur", "tier": "Hub", "zone": "ZRK", "sqft": 6660, "state": "Punjab", "st": "PB", "region": "N2", "regionName": "North 2", "status": "Active", "lat": 30.64, "lng": 76.82}, {"code": "PNQT1", "name": "Pune", "city": "Pune", "tier": "Hub", "zone": "PNQ", "sqft": 6000, "state": "Maharashtra", "st": "MH", "region": "W2", "regionName": "West 2", "status": "Active", "lat": 18.52, "lng": 73.86}, {"code": "GGNT1", "name": "Gurugram", "city": "Gurugram", "tier": "Hub", "zone": "GGN", "sqft": 10000, "state": "Haryana", "st": "HR", "region": "N1", "regionName": "North 1", "status": "Active", "lat": 28.46, "lng": 77.03}, {"code": "JAIT1", "name": "Jaipur", "city": "Jaipur", "tier": "Hub", "zone": "JAI", "sqft": 5000, "state": "Rajasthan", "st": "RJ", "region": "N2", "regionName": "North 2", "status": "Active", "lat": 26.91, "lng": 75.79}, {"code": "CHNT1", "name": "Chennai", "city": "Chennai", "tier": "Hub", "zone": "CHN", "sqft": 10000, "state": "Tamil Nadu", "st": "TN", "region": "S2", "regionName": "South 2", "status": "Active", "lat": 13.08, "lng": 80.27}, {"code": "HWRT1", "name": "Haridwar", "city": "Haridwar", "tier": "Hub", "zone": "HWR", "sqft": 5000, "state": "Uttarakhand", "st": "UT", "region": "N2", "regionName": "North 2", "status": "Active", "lat": 29.95, "lng": 78.16}, {"code": "RKEB1", "name": "Roorkee", "city": "Roorkee", "tier": "Mini-Hub", "zone": "RKE", "sqft": 500, "state": "Uttarakhand", "st": "UT", "region": "N2", "regionName": "North 2", "status": "Active", "lat": 29.85, "lng": 77.89}, {"code": "DDNB1", "name": "Dehradun", "city": "Dehradun", "tier": "Mini-Hub", "zone": "DDN", "sqft": 550, "state": "Uttarakhand", "st": "UT", "region": "N2", "regionName": "North 2", "status": "Active", "lat": 30.32, "lng": 78.03}, {"code": "RDPB1", "name": "Rudrapur", "city": "Rudrapur", "tier": "Mini-Hub", "zone": "RDP", "sqft": 1200, "state": "Uttarakhand", "st": "UT", "region": "N2", "regionName": "North 2", "status": "Active", "lat": 28.98, "lng": 79.4}, {"code": "BBIB1", "name": "Bhubaneswar", "city": "Bhubaneswar", "tier": "Mini-Hub", "zone": "BBI", "sqft": 1150, "state": "Odisha", "st": "OR", "region": "E2", "regionName": "East 2", "status": "Active", "lat": 20.3, "lng": 85.82}, {"code": "VNSB1", "name": "Varanasi", "city": "Varanasi", "tier": "Mini-Hub", "zone": "VNS", "sqft": 5750, "state": "Uttar Pradesh", "st": "UP", "region": "N2", "regionName": "North 2", "status": "Active", "lat": 25.32, "lng": 83.01}, {"code": "KNPB1", "name": "Kanpur", "city": "Kanpur", "tier": "Mini-Hub", "zone": "KNP", "sqft": 4800, "state": "Uttar Pradesh", "st": "UP", "region": "N2", "regionName": "North 2", "status": "Active", "lat": 26.45, "lng": 80.35}, {"code": "IDRT1", "name": "Indore", "city": "Indore", "tier": "Hub", "zone": "IDR", "sqft": 1500, "state": "Madhya Pradesh", "st": "MP", "region": "W1", "regionName": "West 1", "status": "Active", "lat": 22.72, "lng": 75.86}], "lanes": [{"sno": 1, "name": "DEL ->JAI -> AMD -> VAP -> BOM", "origin": "DEL", "dest": "BOM", "dir": "Round trip", "type": "Trunk", "path": ["GGNT1", "JAIT1", "AMDT1", "VAPT1", "BOMT1"], "nodes": ["DEL", "JAI", "AMD", "VAP", "BOM"], "flags": "DEL has no facility code of its own — proxied to GGNT1"}, {"sno": 2, "name": "DEL ->NGP -> HYD -> BLR", "origin": "DEL", "dest": "BLR", "dir": "One way", "type": "Trunk", "path": ["GGNT1", "NGPT1", "HYDT1", "BLRT1"], "nodes": ["DEL", "NGP", "HYD", "BLR"], "flags": "BLR endpoint is ambiguous (BLRT1 or BLRT2); DEL has no facility code of its own — proxied to GGNT1"}, {"sno": 3, "name": "DEL ->KOL", "origin": "DEL", "dest": "KOL", "dir": "One way", "type": "Direct", "path": ["GGNT1", "KOLT1"], "nodes": ["DEL", "KOL"], "flags": "DEL has no facility code of its own — proxied to GGNT1"}, {"sno": 4, "name": "BOM -> VAP -> AMD -> JAI -> DEL", "origin": "BOM", "dest": "DEL", "dir": "Round trip", "type": "Trunk", "path": ["BOMT1", "VAPT1", "AMDT1", "JAIT1", "GGNT1"], "nodes": ["BOM", "VAP", "AMD", "JAI", "DEL"], "flags": "DEL has no facility code of its own — proxied to GGNT1"}, {"sno": 5, "name": "DEL -> LKO", "origin": "DEL", "dest": "LKO", "dir": "Round trip", "type": "Direct", "path": ["GGNT1", "LKOT1"], "nodes": ["DEL", "LKO"], "flags": "DEL has no facility code of its own — proxied to GGNT1"}, {"sno": 6, "name": "BOM -> HYD -> BLR", "origin": "BOM", "dest": "BLR", "dir": "Round trip", "type": "Trunk", "path": ["BOMT1", "HYDT1", "BLRT1"], "nodes": ["BOM", "HYD", "BLR"], "flags": "BLR endpoint is ambiguous (BLRT1 or BLRT2)"}, {"sno": 7, "name": "KOL -> NJP -> GWH", "origin": "KOL", "dest": "GWH", "dir": "One way", "type": "Trunk", "path": ["KOLT1", null, "GWHT1"], "nodes": ["KOL", "NJP", "GWH"], "flags": "Un-facilitied node(s): NJP"}, {"sno": 8, "name": "BOM -> VAP -> AMD", "origin": "BOM", "dest": "AMD", "dir": "Round trip", "type": "Trunk", "path": ["BOMT1", "VAPT1", "AMDT1"], "nodes": ["BOM", "VAP", "AMD"], "flags": null}, {"sno": 10, "name": "AMD -> VAP -> BOM", "origin": "AMD", "dest": "BOM", "dir": "Round trip", "type": "Trunk", "path": ["AMDT1", "VAPT1", "BOMT1"], "nodes": ["AMD", "VAP", "BOM"], "flags": null}, {"sno": 11, "name": "BLR -> HYD -> BOM", "origin": "BLR", "dest": "BOM", "dir": "Round trip", "type": "Trunk", "path": ["BLRT1", "HYDT1", "BOMT1"], "nodes": ["BLR", "HYD", "BOM"], "flags": "BLR endpoint is ambiguous (BLRT1 or BLRT2)"}, {"sno": 12, "name": "LKO -> DEL", "origin": "LKO", "dest": "DEL", "dir": "Round trip", "type": "Direct", "path": ["LKOT1", "GGNT1"], "nodes": ["LKO", "DEL"], "flags": "DEL has no facility code of its own — proxied to GGNT1"}, {"sno": 13, "name": "DEL -> MBD -> RDP", "origin": "DEL", "dest": "RDP", "dir": "One way", "type": "Trunk", "path": ["GGNT1", null, "RDPB1"], "nodes": ["DEL", "MBD", "RDP"], "flags": "Un-facilitied node(s): MBD; Terminates at a MINI-HUB; DEL has no facility code of its own — proxied to GGNT1"}, {"sno": 14, "name": "DEL -> ZRK", "origin": "DEL", "dest": "ZRK", "dir": "One way", "type": "Direct", "path": ["GGNT1", "ZRKT1"], "nodes": ["DEL", "ZRK"], "flags": "DEL has no facility code of its own — proxied to GGNT1"}], "regionNames": ["North 1", "North 2", "North 3", "West 1", "West 2", "South 1", "South 2", "South 3", "South 4", "East 1", "East 2", "North East 1", "North East 2"], "rate": {"North 1": [5, 5.25, 6, 7, 7.25, 8, 9.5, 11, 14, 8.25, 9.5, 11, 18], "North 2": [5.25, 5, 6, 8.5, 10, 10, 12, 14, 16, 9, 11, 12, 18], "North 3": [6, 6, 7, 9.5, 12, 12, 14, 16, 16, 8, 10, 12, 18], "West 1": [6.75, 7.5, 9, 6, 7, 6.5, 7.5, 8, 9.5, 9.5, 12, 15, 18], "West 2": [7.25, 9, 10, 7, 8, 8, 9, 10, 11, 12, 14, 16, 18], "South 1": [8, 10, 11, 6.5, 7.5, 6, 7.5, 8, 9, 10, 12, 16, 18], "South 2": [9.5, 12, 12, 7.5, 9, 7, 8, 8, 9, 12, 14, 16, 18], "South 3": [11, 14, 13, 8, 9.5, 8, 8, 11, 9, 12, 14, 18, 18], "South 4": [14, 15, 14, 14, 14, 9, 9, 9, 8, 14, 16, 18, 18], "East 1": [8.25, 10, 8, 10, 12, 12, 13, 14, 14, 7, 8, 10, 18], "East 2": [9.5, 12, 9, 10, 12, 12, 13, 14, 14, 8, 9, 12, 18], "North East 1": [11, 14, 14, 14, 16, 14, 16, 18, 18, 10, 12, 7, 15], "North East 2": [15, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18, 18]}};
  var T = {};
  T.NET = NET;

  // ------------------------------------------------------------------ small helpers
  function Y() { return React; }
  function e() { var R = Y(); return R.createElement.apply(R, arguments); }
  T.e = e;
  function inr(n) { n = Math.round(Number(n) || 0); return '₹' + n.toLocaleString('en-IN'); }
  function inr2(n) { n = Number(n) || 0; return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function r1(n) { return Math.round((Number(n) || 0) * 10) / 10; }
  function r2(n) { return Math.round((Number(n) || 0) * 100) / 100; }
  function pad(n, w) { return String(n).padStart(w, '0'); }
  function fmtDT(ts) {
    if (!ts) return '—';
    var d = new Date(ts);
    return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false });
  }
  function fmtD(ts) { return ts ? new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'; }
  function hrs(h) { h = Number(h) || 0; var m = Math.round(h * 60); return Math.floor(m / 60) + 'h ' + pad(m % 60, 2) + 'm'; }
  function hash(str) { var h = 0; str = String(str); for (var i = 0; i < str.length; i++) h = (h * 31 + str.charCodeAt(i)) >>> 0; return h; }
  T.fmt = { inr: inr, inr2: inr2, r1: r1, r2: r2, dt: fmtDT, d: fmtD, hrs: hrs, pad: pad };
  var H = 3600 * 1000, DAY = 24 * H;
  var NOW = Date.now();
  T.NOW = NOW;

  // ------------------------------------------------------------------ network
  var FAC = {}; NET.fac.forEach(function (f) { FAC[f.code] = f; });
  T.fac = function (c) { return FAC[c] || null; };
  T.facLabel = function (c) { var f = FAC[c]; return f ? (f.code + ' · ' + f.name) : (c || '—'); };
  T.facShort = function (c) { var f = FAC[c]; return f ? f.city : c; };
  T.activeFac = NET.fac.filter(function (f) { return f.status !== 'CLOSED'; });
  function hav(a, b) {
    var R = 6371, dLat = (b.lat - a.lat) * Math.PI / 180, dLng = (b.lng - a.lng) * Math.PI / 180;
    var x = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(a.lat * Math.PI / 180) * Math.cos(b.lat * Math.PI / 180) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
  }
  var ROAD_FACTOR = 1.25; // indicative: great-circle × 1.25 until the Route Master carries real road km
  T.legKm = function (a, b) { return a === b ? 0 : Math.max(1, Math.round(hav(FAC[a], FAC[b]) * ROAD_FACTOR)); };
  T.pathKm = function (path) { var s = 0; for (var i = 0; i < path.length - 1; i++) s += T.legKm(path[i], path[i + 1]); return s; };
  T.SPEED_KMPH = 45;       // Route Base Speed (Trip Life Cycle sheet), editable later in Route Master
  T.DWELL_H = 3;           // Sch. GIGO TAT hours at a pitstop
  T.ORIGIN_DWELL_H = 2;    // BIBO load time at origin

  // Lanes that contain origin→dest in order (round-trip lanes also match reversed)
  T.lanesFor = function (o, d) {
    var out = [];
    NET.lanes.forEach(function (L) {
      var p = L.path.filter(function (x) { return x; });
      var fwd = p.slice();
      var oi = fwd.indexOf(o), di = fwd.indexOf(d);
      if (oi > -1 && di > oi) out.push({ lane: L, path: fwd.slice(oi, di + 1), reversed: false });
      else if (L.dir === 'Round trip') {
        var rv = p.slice().reverse(); oi = rv.indexOf(o); di = rv.indexOf(d);
        if (oi > -1 && di > oi) out.push({ lane: L, path: rv.slice(oi, di + 1), reversed: true });
      }
    });
    return out;
  };
  // cheapest-insertion of an extra pitstop into a path
  T.insertStop = function (path, code) {
    if (path.indexOf(code) > -1) return path.slice();
    var best = 1, bestCost = Infinity;
    for (var i = 0; i < path.length - 1; i++) {
      var c = T.legKm(path[i], code) + T.legKm(code, path[i + 1]) - T.legKm(path[i], path[i + 1]);
      if (c < bestCost) { bestCost = c; best = i + 1; }
    }
    var np = path.slice(); np.splice(best, 0, code); return np;
  };
  // schedule: per stop arrival / departure from a departure timestamp
  T.schedule = function (path, departTs) {
    var out = [], t = departTs;
    for (var i = 0; i < path.length; i++) {
      if (i === 0) { out.push({ code: path[0], arr: null, dep: departTs }); continue; }
      var km = T.legKm(path[i - 1], path[i]);
      t += (km / T.SPEED_KMPH) * H;
      var arr = t;
      var dep = (i === path.length - 1) ? null : arr + T.DWELL_H * H;
      out.push({ code: path[i], arr: arr, dep: dep, legKm: km });
      if (dep) t = dep;
    }
    return out;
  };

  // ------------------------------------------------------------------ vehicle types + partner (vendor) pricing
  // Capacities follow the Partner Pricing prototype (8 Oct) fleet types. Rates are ILLUSTRATIVE seeds.
  T.VTYPES = [
    { type: 'ICV · up to 3.5T', short: 'ICV', capKg: 1500, capCft: 350, perKm: 19, mileage: 9 },
    { type: 'MCV · up to 7.5T', short: 'MCV', capKg: 3500, capCft: 650, perKm: 27, mileage: 7 },
    { type: 'HCV · up to 16T', short: 'HCV', capKg: 9000, capCft: 1400, perKm: 39, mileage: 4.5 },
    { type: '32ft container', short: '32ft', capKg: 18000, capCft: 2500, perKm: 54, mileage: 3.6 }
  ];
  T.vtype = function (t) { return T.VTYPES.filter(function (v) { return v.type === t; })[0] || T.VTYPES[2]; };
  T.PARTNER = { minKm: 300, tollPerKm: 3.1, loadUnloadPerStop: 350, marketPremium: 0.15, dieselPrice: 100, driverPerKm: 4.5, maintPerKm: 3.0, tyrePerKm: 1.5, otaIncentive: 500 };
  // method: 'km' | 'trip' | 'kg'.  sourcing: 'Owned' | 'Vendor' | 'Market'
  T.partnerCost = function (o) {
    var P = T.PARTNER, vt = T.vtype(o.vehicleType), km = Math.max(o.km || 0, 0), stops = Math.max((o.stops || 2) - 0, 2);
    var lines = [], base = 0;
    if (o.sourcing === 'Owned') {
      var fuel = km * (P.dieselPrice / vt.mileage);
      lines.push(['Fuel (' + vt.mileage + ' km/l @ ₹' + P.dieselPrice + ')', fuel]);
      lines.push(['Driver + helper (₹' + P.driverPerKm + '/km)', km * P.driverPerKm]);
      lines.push(['Maintenance + tyres (₹' + (P.maintPerKm + P.tyrePerKm) + '/km)', km * (P.maintPerKm + P.tyrePerKm)]);
      base = lines.reduce(function (s, l) { return s + l[1]; }, 0);
    } else {
      var method = o.method || 'km';
      if (method === 'trip') { base = Number(o.tripRate) || 0; lines.push(['Contracted per-trip rate', base]); }
      else if (method === 'kg') { base = (Number(o.kgRate) || 0) * (o.chargedKg || 0); lines.push(['₹' + (o.kgRate || 0) + '/kg × ' + Math.round(o.chargedKg || 0) + ' kg', base]); }
      else {
        var billKm = Math.max(km, P.minKm);
        base = billKm * (Number(o.kmRate) || vt.perKm);
        lines.push([(km < P.minKm ? 'Min ' + P.minKm + ' km' : Math.round(km) + ' km') + ' × ₹' + (Number(o.kmRate) || vt.perKm) + '/km', base]);
      }
      if (o.sourcing === 'Market') { var prem = base * P.marketPremium; lines.push(['Spot-market premium (' + Math.round(P.marketPremium * 100) + '%)', prem]); base += prem; }
    }
    var handling = (o.sourcing === 'Owned') ? 0 : 0; // loading/unloading is hub-side cost, shown separately
    var toll = km * P.tollPerKm;
    var total = base;
    return { lines: lines, base: base, toll: toll, thc: Math.round(total), tollReimb: Math.round(toll), totalWithToll: Math.round(total + toll), vt: vt };
  };

  // ------------------------------------------------------------------ client pricing (rate card 13×13 + Customer Passport charge heads)
  T.CLIENT_CFG = { minDocketWt: 30, minDocketCharge: 450, fixedDocketCharge: 150, dpi: 100, baseFsc: 20, ownerRiskPct: 0.1, carrierRiskPct: 2.0, minOwnerRisk: 100, minCarrierRisk: 150, gst: 12 };
  T.rateKg = function (o, d) {
    var fo = FAC[o], fd = FAC[d]; if (!fo || !fd) return 0;
    var row = NET.rate[fo.regionName]; var i = NET.regionNames.indexOf(fd.regionName);
    return row && i > -1 ? row[i] : 0;
  };
  T.fscPct = function () { var c = T.CLIENT_CFG; return c.baseFsc + Math.max(0, (c.dpi - 100) / 0.5); }; // 1% per ₹0.5/l above base DPI ₹100
  // Client contract adjustment on the base freight matrix (Customer Passport → "Freight Discount: Rate Card Tool"). ILLUSTRATIVE seeds.
  T.CLIENT_DISC = { 'Nova Retail': 0.08, 'Bluewave Electronics': 0.05, 'Orion Pharma': 0, 'Brainbees Solutions': 0.10, 'Shopl Retail': 0.03, 'ABFRL': 0.12 };
  T.useContract = true;
  T.docketFreight = function (d) {
    var c = T.CLIENT_CFG, rate = T.rateKg(d.origin, d.dest), disc = T.useContract ? (T.CLIENT_DISC[d.client] || 0) : 0;
    var chargeWt = Math.max(d.actWt, d.volWt, c.minDocketWt);
    var raw = rate * chargeWt * (1 - disc), base = Math.max(raw, c.minDocketCharge);
    var fsc = base * T.fscPct() / 100, fixed = c.fixedDocketCharge;
    var risk = d.risk === 'Carrier' ? Math.max(d.invoice * c.carrierRiskPct / 100, c.minCarrierRisk) : Math.max(d.invoice * c.ownerRiskPct / 100, c.minOwnerRisk);
    var pre = base + fsc + fixed + risk, gst = pre * c.gst / 100;
    return { rate: rate, disc: disc, chargeWt: chargeWt, raw: raw, base: base, minApplied: raw < c.minDocketCharge, fsc: fsc, fixed: fixed, risk: risk, pre: pre, gst: gst, total: pre + gst };
  };

  // ------------------------------------------------------------------ dockets (seed = hand-off from 1B: "drop scan at mini hub / hub")
  function checkDigit(body9) { return String(Number(body9) % 7); }
  function makeDocketNo(prefix3, running6) { var body = String(prefix3).padStart(3, '0') + String(running6).padStart(6, '0'); return body + checkDigit(body); }
  T.fmtDocket = function (n) { n = String(n || ''); return n.length === 10 ? n.slice(0, 4) + ' ' + n.slice(4, 8) + ' ' + n.slice(8) : n; };
  var serial = 410001;
  var CLIENTS = ['Nova Retail', 'Bluewave Electronics', 'Orion Pharma', 'Brainbees Solutions', 'Shopl Retail', 'ABFRL'];
  T.dockets = [];
  function mkD(loc, dest, client, packs, wt, invoice, ewbHrs, o) {
    o = o || {};
    var no = makeDocketNo('100', serial++);
    var cftPerPack = o.cft || 2.4;
    var cft = r1(packs * cftPerPack), volWt = r1(cft * 6);
    var d = { no: no, grp: o.grp || null, client: client, origin: loc, loc: loc, dest: dest, packs: packs, actWt: wt, cft: cft, volWt: volWt, chargeWt: Math.max(wt, volWt), invoice: invoice, risk: o.risk || 'Owner', prio: o.prio || 'Normal', cod: !!o.cod, status: 'At hub', tripRef: null };
    if (ewbHrs != null) { d.ewbNo = '3' + pad(hash(no) % 100000000000, 11); d.ewbValidTill = NOW + ewbHrs * H; }
    else d.ewbNo = null;
    T.dockets.push(d); return d;
  }
  T.packNo = function (dn, i) { return dn + pad(i, 2); };
  T.packsOf = function (d) { var a = []; for (var i = 1; i <= d.packs; i++) a.push(T.packNo(d.no, i)); return a; };
  T.docketByNo = function (n) { return T.dockets.filter(function (d) { return d.no === n; })[0] || null; };
  T.docketByPack = function (pk) { return T.docketByNo(String(pk).slice(0, 10)); };

  // deterministic stock generator (seeded PRNG) — realistic PTL volumes: a long-haul truck leaves with ~20–30 dockets
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; var t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function gen(loc, dest, n, o) {
    o = o || {}; var R = rng(hash(loc + dest + (o.grp || '') + n));
    for (var i = 0; i < n; i++) {
      var packs = (o.minPk || 6) + Math.floor(R() * (o.spanPk || 18)), per = (o.minW || 18) + Math.floor(R() * (o.spanW || 24)), wt = packs * per;
      var invoice = Math.round(wt * (120 + R() * 600) / 1000) * 1000, ewb = 36 + Math.round(R() * 100), roll = R();
      if (roll < 0.09) ewb = 6 + Math.round(R() * 10);              // short validity → flagged at CEWB
      var cftPer = 1.8 + R() * 1.6; if (R() < 0.06) cftPer *= 2.2;   // a few bulky ones
      var noEwb = false; if (R() < 0.07) { invoice = 28000 + Math.round(R() * 18000); noEwb = true; }
      mkD(loc, dest, CLIENTS[(i + hash(loc + dest)) % CLIENTS.length], packs, wt, invoice, noEwb ? null : ewb, { risk: R() < 0.15 ? 'Carrier' : 'Owner', prio: R() < 0.15 ? 'Priority' : 'Normal', cft: cftPer, grp: o.grp });
    }
  }
  // lane 1 forward stock at Gurugram + pit-stop stock at Jaipur
  gen('GGNT1', 'JAIT1', 4); gen('GGNT1', 'AMDT1', 6); gen('GGNT1', 'VAPT1', 3); gen('GGNT1', 'BOMT1', 9);
  gen('JAIT1', 'AMDT1', 2); gen('JAIT1', 'BOMT1', 3);
  // return stock at Bhiwandi (to-fro for lane 1: BOM→…→GGN) — group B; group A feeds the lane-4 demo trip
  gen('BOMT1', 'VAPT1', 2, { grp: 'B' }); gen('BOMT1', 'AMDT1', 4, { grp: 'B' }); gen('BOMT1', 'JAIT1', 3, { grp: 'B' }); gen('BOMT1', 'GGNT1', 10, { grp: 'B' });
  gen('BOMT1', 'VAPT1', 3, { grp: 'A' }); gen('BOMT1', 'AMDT1', 4, { grp: 'A' }); gen('BOMT1', 'JAIT1', 3, { grp: 'A' }); gen('BOMT1', 'GGNT1', 6, { grp: 'A' });
  // lane 2 (GGN→NGP→HYD→BLR)
  gen('GGNT1', 'NGPT1', 4); gen('GGNT1', 'HYDT1', 6); gen('GGNT1', 'BLRT1', 8);
  // lane 6 (BOM→HYD→BLR) onboard for the in-transit demo trip, plus Hyderabad pit-stop stock
  gen('BOMT1', 'HYDT1', 6); gen('BOMT1', 'BLRT1', 8); gen('HYDT1', 'BLRT1', 4);
  // lane 5 (GGN→LKO) smaller dockets for the 7.5T arrival demo, plus Lucknow return stock
  gen('GGNT1', 'LKOT1', 8, { minPk: 5, spanPk: 8, minW: 16, spanW: 14 }); gen('LKOT1', 'GGNT1', 8, { minPk: 5, spanPk: 10, minW: 16, spanW: 14 });
  T.stockAt = function (loc) { return T.dockets.filter(function (d) { return d.loc === loc && d.status === 'At hub'; }); };

  // ------------------------------------------------------------------ vehicles + drivers (seed)
  function docs(o) { // days to expiry
    var r = {}; Object.keys(o).forEach(function (k) { r[k] = NOW + o[k] * DAY; }); return r;
  }
  T.vehicles = [
    { id: 'V01', regNo: 'HR55 AB 4521', type: '32ft container', own: 'Owned', vendor: '', loc: 'GGNT1', status: 'Available', newVeh: false, docs: docs({ rc: 700, insurance: 160, puc: 90, permit: 340, fitness: 400 }), driver: 'D01' },
    { id: 'V02', regNo: 'HR38 CD 8890', type: 'HCV · up to 16T', own: 'Vendor', vendor: 'Speedway Logistics', loc: 'GGNT1', status: 'Available', newVeh: false, docs: docs({ rc: 500, insurance: 80, puc: 120, permit: 200, fitness: 260 }), driver: 'D02' },
    { id: 'V03', regNo: 'DL1G 2231', type: 'MCV · up to 7.5T', own: 'Vendor', vendor: 'Bharat Carriers', loc: 'GGNT1', status: 'Available', newVeh: false, docs: docs({ rc: 500, insurance: 5, puc: 60, permit: 200, fitness: 300 }), driver: 'D03' },
    { id: 'V04', regNo: 'MH43 BX 7712', type: '32ft container', own: 'Vendor', vendor: 'Metro Fleet Services', loc: 'BOMT1', status: 'Available', newVeh: false, docs: docs({ rc: 800, insurance: 200, puc: 70, permit: 180, fitness: 250 }), driver: 'D04' },
    { id: 'V05', regNo: 'MH04 KL 1190', type: 'HCV · up to 16T', own: 'Owned', vendor: '', loc: 'BOMT1', status: 'Available', newVeh: false, docs: docs({ rc: 900, insurance: 140, puc: 25, permit: 260, fitness: 300 }), driver: 'D05' },
    { id: 'V06', regNo: 'KA51 AA 3340', type: 'MCV · up to 7.5T', own: 'Owned', vendor: '', loc: 'BLRT1', status: 'Available', newVeh: true, docs: docs({ rc: 1200, insurance: 300, puc: 20, permit: 300, fitness: 700 }), driver: 'D06' },
    { id: 'V07', regNo: 'TS09 UC 5521', type: 'HCV · up to 16T', own: 'Vendor', vendor: 'RoadLine Express', loc: 'HYDT1', status: 'Available', newVeh: false, docs: docs({ rc: 600, insurance: 90, puc: 80, permit: 150, fitness: 220 }), driver: 'D07' },
    { id: 'V08', regNo: 'UP32 GT 9087', type: 'ICV · up to 3.5T', own: 'Vendor', vendor: 'Speedway Logistics', loc: 'LKOT1', status: 'Available', newVeh: false, docs: docs({ rc: 400, insurance: 120, puc: 100, permit: 210, fitness: 190 }), driver: 'D08' },
    { id: 'V09', regNo: 'RJ14 GB 6612', type: '32ft container', own: 'Market', vendor: 'Spot market (Jaipur)', loc: 'JAIT1', status: 'Available', newVeh: false, docs: docs({ rc: 500, insurance: 100, puc: 60, permit: -3, fitness: 120 }), driver: 'D09' },
    { id: 'V10', regNo: 'GJ01 HT 4410', type: 'HCV · up to 16T', own: 'Market', vendor: 'Spot market (Ahmedabad)', loc: 'AMDT1', status: 'Available', newVeh: false, docs: docs({ rc: 500, insurance: 180, puc: 90, permit: 220, fitness: 180 }), driver: 'D10' },
    { id: 'V11', regNo: 'HR55 AC 9911', type: '32ft container', own: 'Owned', vendor: '', loc: 'GGNT1', status: 'Available', newVeh: true, docs: docs({ rc: 1400, insurance: 350, puc: 340, permit: 360, fitness: 900 }), driver: 'D11' }
  ];
  var DN = ['Ramesh Yadav', 'Suresh Chauhan', 'Imran Qureshi', 'Prakash Jadhav', 'Manoj Pawar', 'Venkatesh Reddy', 'Srinivas Rao', 'Anwar Hussain', 'Devendra Singh', 'Kiran Patel', 'Rakesh Meena'];
  T.drivers = DN.map(function (n, i) { return { id: 'D' + pad(i + 1, 2), name: n, mobile: '9' + pad(800000000 + hash(n) % 100000000, 9).slice(0, 9), licence: 'DL-' + pad(1000000 + hash(n) % 8999999, 7), licExpiry: NOW + (i === 2 ? 12 : 400 + i * 30) * DAY, face: i !== 7, suraksha: i % 4 !== 3 }; });
  T.driverById = function (id) { return T.drivers.filter(function (d) { return d.id === id; })[0] || null; };
  T.vehicleById = function (id) { return T.vehicles.filter(function (v) { return v.id === id; })[0] || null; };

  // document validation: 1 month → intimate (warn), 1 week → block  (Trip Life Cycle sheet: "Truck Docs Validation (1 Mo Intimate, 1 Wk Block)")
  T.DOC_LABELS = { rc: 'Registration Certificate', insurance: 'Insurance', puc: 'PUC', permit: 'Permit', fitness: 'Fitness Certificate' };
  T.docState = function (ts) { var d = (ts - NOW) / DAY; return d < 7 ? 'block' : (d < 30 ? 'warn' : 'ok'); };
  T.vehicleCompliance = function (v) {
    var res = { state: 'ok', items: [] };
    Object.keys(T.DOC_LABELS).forEach(function (k) {
      var st = T.docState(v.docs[k]), days = Math.floor((v.docs[k] - NOW) / DAY);
      res.items.push({ key: k, label: T.DOC_LABELS[k], state: st, days: days, expiry: v.docs[k] });
      if (st === 'block') res.state = 'block'; else if (st === 'warn' && res.state !== 'block') res.state = 'warn';
    });
    return res;
  };

  // ------------------------------------------------------------------ trips / legs
  T.trips = [];
  var tripSeq = 2601, thcSeq = 9001, mnfSeq = 1;
  function newLeg(dir, path, depart) {
    return { dir: dir, path: path.slice(), departTs: depart, manifest: [], locked: false, mnfNo: null, tcs: [], cewb: null, exec: null, arrival: null, closure: null, done: false };
  }
  T.newTrip = function (o) {
    var id = o.id || ('TRP-' + (tripSeq++));
    var t = { id: id, created: o.created || NOW, client: o.client || 'Network line-haul', type: o.type, laneSno: o.laneSno || null, twoWay: !!o.twoWay, activeDir: 'fwd',
      pricing: o.pricing || null, sourcing: o.sourcing || 'Vendor', vehicleType: o.vehicleType || T.VTYPES[2].type, vehicle: null, driver1: null, driver2: null, thc: null,
      leg: { fwd: newLeg('fwd', o.path, o.depart) }, notes: [] };
    if (t.twoWay) t.leg.ret = newLeg('ret', o.path.slice().reverse(), o.retDepart || (o.depart + (o.path.length * 6 + 10) * H));
    T.trips.unshift(t); return t;
  };
  T.tripById = function (id) { return T.trips.filter(function (t) { return t.id === id; })[0] || null; };
  T.cur = function (t) { return t.leg[t.activeDir] || t.leg.fwd; };
  T.stageOf = function (t) {
    var L = T.cur(t);
    // returns the stage that is pending / being worked on (7 = all six stages done)
    if (L.closure) return 7;
    if (L.arrival && L.arrival.reachedAt) return 6;
    if (L.exec && L.exec.started) return 5;
    if (L.cewb) return 5;
    if (L.locked) return 4;      // manifest locked, CEWB pending
    if (t.vehicle && t.thc) return 3;
    return 2;
  };
  T.STAGES = [
    { n: 1, key: 'route-pricing', name: 'Route & Pricing', path: '/trip-ops/route-pricing' },
    { n: 2, key: 'vehicle', name: 'Vehicle Assign', path: '/trip-ops/vehicle-assign' },
    { n: 3, key: 'manifest', name: 'Manifest · To-Fro', path: '/trip-ops/manifest' },
    { n: 4, key: 'cewb', name: 'CEWB', path: '/trip-ops/cewb' },
    { n: 5, key: 'scan', name: 'Multi-stop Scan → Descan', path: '/trip-ops/scan-descan' },
    { n: 6, key: 'arrival', name: 'Final Hub Arrival', path: '/trip-ops/final-arrival' }
  ];
  T.stageLabel = function (t) {
    var L = T.cur(t), s = T.stageOf(t);
    if (L.closure) return 'Closed';
    if (L.arrival && L.arrival.reachedAt) return 'Reached final hub';
    if (L.exec && L.exec.started) return 'In transit';
    if (L.cewb) return 'CEWB ready';
    if (L.locked) return 'Manifest locked';
    if (t.vehicle && t.thc) return L.manifest.length ? 'Manifesting' : 'Vehicle assigned';
    return 'Route planned';
  };

  // ------------------------------------------------------------------ store (pub/sub)
  var listeners = [];
  T.sel = null;
  T.emit = function () { listeners.slice().forEach(function (f) { try { f(); } catch (x) { } }); };
  T.mutate = function (fn) { fn(); T.emit(); };
  T.useStore = function () {
    var y = Y(), st = y.useState(0), setN = st[1];
    y.useEffect(function () { var f = function () { setN(function (n) { return n + 1; }); }; listeners.push(f); return function () { listeners = listeners.filter(function (x) { return x !== f; }); }; }, []);
    return T;
  };
  // Router bridge: the page wrapper (OpsPage) keeps T.router current on every render.
  T.router = { navigate: function () {}, search: '', pathname: '' };
  T.hashParam = function (k) { return new URLSearchParams(T.router.search || '').get(k); };
  T.curPath = function () { return String(T.router.pathname || '').replace(/^\/trip-management/, ''); };
  T.pickTrip = function (filter) {
    var hp = T.hashParam('trip'), hpt = hp ? T.tripById(hp) : null;
    if (hpt) { T.sel = hpt.id; return hpt; }
    var t = T.sel ? T.tripById(T.sel) : null;
    if (t && (!filter || filter(t))) { T.sel = t.id; return t; }
    var f = T.trips.filter(function (x) { return !filter || filter(x); })[0];
    if (f) { T.sel = f.id; return f; }
    return T.tripById(T.sel) || T.trips[0] || null;
  };
  T.applyCtx = function (t) { T.useContract = t && t.pricing ? t.pricing.useContract !== false : true;
  };
  T.go = function (path, tripId) { if (tripId) T.sel = tripId; T.router.navigate('/trip-management' + path + (tripId ? '?trip=' + tripId : '')); };

  // ------------------------------------------------------------------ economics (Trip Life Cycle sheet formulas)
  // For one leg: touch points → trip challans (TC) → ton-km → share of THC → per-docket allocation
  T.legDockets = function (L) { return L.manifest.map(T.docketByNo).filter(Boolean); };
  T.legTotals = function (L) {
    var ds = T.legDockets(L), s = { dockets: ds.length, packs: 0, act: 0, charged: 0, cft: 0, invoice: 0 };
    ds.forEach(function (d) { s.packs += d.packs; s.act += d.actWt; s.charged += d.chargeWt; s.cft += d.cft; s.invoice += d.invoice; });
    return s;
  };
  T.economics = function (t, L, thcOverride) {
    var path = L.path, ds = T.legDockets(L), vt = T.vtype(t.vehicleType);
    var thc = thcOverride != null ? thcOverride : (t.thc ? t.thc.amount : (t.pricing ? t.pricing.thc : 0));
    var km = T.pathKm(path), tripTonKm = (vt.capKg / 1000) * km;
    var tcs = [];
    for (var i = 0; i < path.length - 1; i++) {
      // loading stop = where the docket is picked up on this leg (its loc at manifest time)
      var onb = ds.filter(function (d) { var li = path.indexOf(d.loadAt || d.loc), di = path.indexOf(d.dest); return li <= i && di > i; });
      var legKm = T.legKm(path[i], path[i + 1]);
      var act = onb.reduce(function (s, d) { return s + d.actWt; }, 0), chg = onb.reduce(function (s, d) { return s + d.chargeWt; }, 0);
      tcs.push({ idx: i, from: path[i], to: path[i + 1], km: legKm, dockets: onb.length, packs: onb.reduce(function (s, d) { return s + d.packs; }, 0), act: act, charged: chg, tonKm: (act / 1000) * legKm, ds: onb });
    }
    var sumTonKm = tcs.reduce(function (s, c) { return s + c.tonKm; }, 0);
    tcs.forEach(function (c) { c.share = sumTonKm ? thc * c.tonKm / sumTonKm : thc * c.km / (km || 1); c.perKg = c.act ? c.share / c.act : 0; c.perTonKm = c.tonKm ? c.share / c.tonKm : 0; });
    var rev = 0, revRows = ds.map(function (d) { var f = T.docketFreight(d); rev += f.pre; return { d: d, f: f }; });
    var tot = T.legTotals(L);
    var capUtil = tripTonKm ? sumTonKm / tripTonKm : 0;
    return { km: km, tripTonKm: tripTonKm, sumTonKm: sumTonKm, tcs: tcs, thc: thc, thcPerTonKm: tripTonKm ? thc / tripTonKm : 0, costPerKm: km ? thc / km : 0, costPerKg: tot.act ? thc / tot.act : 0,
      revenue: rev, revRows: revRows, contribution: rev - thc, costPctRev: rev ? thc / rev * 100 : 0, capUtil: capUtil, totals: tot, vt: vt };
  };

  // ------------------------------------------------------------------ manifest rules
  T.canLoad = function (t, L, d) {
    var vt = T.vtype(t.vehicleType), tot = T.legTotals(L);
    var wtAfter = tot.act + d.actWt, cftAfter = tot.cft + d.cft;
    if (wtAfter > vt.capKg) return { ok: false, why: 'Over payload: ' + Math.round(wtAfter) + ' / ' + vt.capKg + ' kg' };
    if (cftAfter > vt.capCft) return { ok: false, why: 'Over volume: ' + r1(cftAfter) + ' / ' + vt.capCft + ' cft' };
    return { ok: true };
  };
  // a docket is eligible on a leg if it sits at a path stop and its destination is a later stop on that path
  T.eligible = function (L, d) {
    if (d.status !== 'At hub') return false;
    var li = L.path.indexOf(d.loc), di = L.path.indexOf(d.dest);
    return li > -1 && di > li;
  };
  T.addToManifest = function (t, L, d) {
    if (L.locked) return { ok: false, why: 'Manifest is locked' };
    if (L.manifest.indexOf(d.no) > -1) return { ok: false, why: 'Already on manifest' };
    if (!T.eligible(L, d)) return { ok: false, why: 'Docket does not travel on this leg' };
    var c = T.canLoad(t, L, d); if (!c.ok) return c;
    L.manifest.push(d.no); d.loadAt = d.loc; d.status = 'Manifested'; d.tripRef = t.id + ':' + L.dir; return { ok: true };
  };
  T.removeFromManifest = function (t, L, d) {
    if (L.locked) return false;
    L.manifest = L.manifest.filter(function (n) { return n !== d.no; });
    d.status = 'At hub'; d.tripRef = null; delete d.loadAt; return true;
  };
  // LIFO load order: farthest destination loads first; ties by heavier first
  T.lifoOrder = function (L, ds) {
    return ds.slice().sort(function (a, b) { var da = L.path.indexOf(a.dest), db = L.path.indexOf(b.dest); return db - da || b.actWt - a.actWt; });
  };
  // 3×3 truck-bay layout (LF CF RF / LM CM RM / LB CB RB): back row = first off-load, front = last
  T.layout = function (L, ds) {
    var order = T.lifoOrder(L, ds).slice().reverse(); // first-off nearest the door
    var cells = { LF: [], CF: [], RF: [], LM: [], CM: [], RM: [], LB: [], CB: [], RB: [] };
    var names = ['LB', 'CB', 'RB', 'LM', 'CM', 'RM', 'LF', 'CF', 'RF'];
    var load = 0, total = ds.reduce(function (s, d) { return s + d.actWt; }, 0) || 1, per = total / 9, ci = 0, acc = 0;
    order.forEach(function (d) { cells[names[Math.min(ci, 8)]].push(d); acc += d.actWt; while (ci < 8 && acc >= per * (ci + 1)) ci++; });
    return cells;
  };

  // ------------------------------------------------------------------ CEWB
  T.EWB_KM_PER_DAY = 200;      // regular cargo: 1 day of validity per 200 km (or part thereof)
  T.EWB_MAX_PER_CEWB = 30;     // soft limit used here — confirm against the NIC e-way bill portal before go-live
  T.ewbDays = function (km) { return Math.max(1, Math.ceil(km / T.EWB_KM_PER_DAY)); };
  T.ETA_AT = function (L, code) {
    var sch = T.schedule(L.path, L.departTs), s = sch.filter(function (x) { return x.code === code; })[0];
    return s ? (s.arr || s.dep) : null;
  };
  // returns { rows:[{d, state, msg, eta}], blockers, warns }
  T.cewbCheck = function (t, L) {
    var rows = [], blockers = 0, warns = 0, ds = T.legDockets(L);
    ds.forEach(function (d) {
      var eta = T.ETA_AT(L, d.dest), row = { d: d, eta: eta, state: 'ok', msg: 'EWB valid through drop' };
      if (!d.ewbNo) {
        if (d.invoice >= 50000) { row.state = 'block'; row.msg = 'No e-way bill — invoice ≥ ₹50,000 (mandatory)'; }
        else { row.state = 'exempt'; row.msg = 'No EWB — invoice < ₹50,000 (optional per Docket QCP exemption)'; }
      } else if (d.ewbValidTill < L.departTs) { row.state = 'block'; row.msg = 'EWB expires ' + fmtDT(d.ewbValidTill) + ' — before departure'; }
      else if (eta && d.ewbValidTill < eta) { row.state = 'warn'; row.msg = 'EWB expires ' + fmtDT(d.ewbValidTill) + ' — before drop at ' + T.facShort(d.dest) + ' (ETA ' + fmtDT(eta) + ')'; }
      if (d.ewbExtended) row.msg += ' · extended';
      if (row.state === 'block') blockers++; if (row.state === 'warn') warns++;
      rows.push(row);
    });
    if (ds.length > T.EWB_MAX_PER_CEWB) { blockers++; rows.unshift({ d: null, state: 'block', msg: ds.length + ' dockets exceeds the ' + T.EWB_MAX_PER_CEWB + ' EWB-per-CEWB limit — split the manifest' }); }
    return { rows: rows, blockers: blockers, warns: warns };
  };
  T.extendEwb = function (d, L) {
    var remKm = T.pathKm(L.path.slice(Math.max(0, L.path.indexOf(d.loadAt || d.loc)))) ; // generous: whole remaining leg
    var days = T.ewbDays(Math.max(remKm, 50));
    d.ewbValidTill = Math.max(d.ewbValidTill, NOW) + days * DAY; d.ewbExtended = (d.ewbExtended || 0) + 1; return days;
  };
  T.generateCEWB = function (t, L, reason, dsOverride) {
    var all = dsOverride || T.legDockets(L);
    var ds = all.filter(function (d) { return d.ewbNo; });
    var n = '3' + pad((hash(t.id + L.dir + (L.cewb ? L.cewb.version : 0) + L.manifest.join('')) % 100000000000), 11);
    var minV = ds.reduce(function (m, d) { return Math.min(m, d.ewbValidTill); }, Infinity);
    var ver = L.cewb ? L.cewb.version + 1 : 1;
    L.cewb = { no: n, version: ver, genAt: Date.now(), vehicle: t.vehicle ? t.vehicle.regNo : '—', from: L.path[0], to: L.path[L.path.length - 1], ewbNos: ds.map(function (d) { return d.ewbNo; }), docketCount: all.length,
      effectiveValidity: minV === Infinity ? null : minV, status: 'Active', reason: reason || 'Initial generation', history: (L.cewb ? L.cewb.history : []).concat(L.cewb ? [{ no: L.cewb.no, version: L.cewb.version, at: L.cewb.genAt, reason: L.cewb.reason }] : []) };
    return L.cewb;
  };

  // ------------------------------------------------------------------ execution: scan to descan (pack-level)
  T.UNLOAD_REASONS = ['Pack in wrong sequence — removed by handler', 'Pallet re-stack needed', 'Driver request', 'Supervisor instruction'];
  T.LIFO_OVERRIDES = ['Pack too large for rear stack', 'Fragile pack — placed on top', 'Pallet already staged at door', 'Supervisor override'];
  T.initExec = function (t, L) {
    if (L.exec) return L.exec;
    L.exec = { started: false, idx: 0, phase: 'at-stop', onboard: [], stops: {}, log: [] };
    T.arriveStop(t, L, 0, true);
    return L.exec;
  };
  T.stopState = function (L, idx) { return L.exec.stops[idx]; };
  T.arriveStop = function (t, L, idx, quiet) {
    var x = L.exec, sch = T.schedule(L.path, L.departTs)[idx], actual = quiet ? sch.arr || L.departTs : Date.now();
    x.idx = idx; x.phase = 'at-stop';
    x.stops[idx] = x.stops[idx] || { code: L.path[idx], arrivedAt: idx === 0 ? null : actual, schArr: sch.arr, steps: {}, unloaded: [], extras: [], mistakes: [], shorts: [], loaded: [], overrides: [], partApprovals: [], seal: null, departedAt: null };
    x.log.push({ at: Date.now(), msg: 'Geo-fence IN · ' + T.facLabel(L.path[idx]) });
  };
  T.stepsFor = function (L, idx) {
    var last = L.path.length - 1;
    if (idx === 0) return ['arrive', 'bay', 'load', 'cewb', 'seal', 'depart'];
    if (idx === last) return ['arrive', 'bay', 'unload', 'reconcile', 'putaway'];
    return ['arrive', 'bay', 'unload', 'reconcile', 'putaway', 'load', 'cewb', 'seal', 'depart'];
  };
  T.STEP_LABEL = { arrive: 'Geo-fence + Gate In', bay: 'Bay In · Seal check', unload: 'Unload scan', reconcile: 'Short / Extra', putaway: 'Put-away', load: 'Load scan (LIFO)', cewb: 'CEWB re-manifest', seal: 'Lock & seal', depart: 'Bay Out · Gate Out' };
  T.onboardDockets = function (L) {
    var seen = {}, out = [];
    L.exec.onboard.forEach(function (pk) { var d = T.docketByPack(pk); if (d && !seen[d.no]) { seen[d.no] = 1; out.push(d); } });
    return out;
  };
  T.expectedUnload = function (L, idx) {
    var code = L.path[idx], last = idx === L.path.length - 1;
    return L.exec.onboard.filter(function (pk) { var d = T.docketByPack(pk); return d && (last || d.dest === code) && L.exec.stops[idx].unloaded.indexOf(pk) < 0; });
  };
  T.scanUnload = function (L, idx, pk) {
    pk = String(pk || '').replace(/\s+/g, ''); var x = L.exec, s = x.stops[idx], code = L.path[idx], last = idx === L.path.length - 1;
    if (!pk) return { result: 'empty', msg: 'Enter or scan a pack number' };
    if (s.unloaded.indexOf(pk) > -1 || s.extras.some(function (q) { return q.pack === pk; })) return { result: 'dup', msg: 'Already scanned at this stop' };
    var d = T.docketByPack(pk), onb = x.onboard.indexOf(pk) > -1;
    if (onb && d) {
      var di = L.path.indexOf(d.dest);
      if (last || d.dest === code) { x.onboard = x.onboard.filter(function (q) { return q !== pk; }); s.unloaded.push(pk); return { result: 'ok', msg: 'Unloaded · docket ' + T.fmtDocket(d.no) + ' · ' + d.client }; }
      if (di > idx) { s.mistakes.push({ pack: pk, kind: 'ahead', at: Date.now() }); return { result: 'ahead', msg: 'DO NOT UNLOAD — belongs to ' + T.facShort(d.dest) + ' (a later stop on this trip). Leave in vehicle.' }; }
      x.onboard = x.onboard.filter(function (q) { return q !== pk; }); s.unloaded.push(pk); s.extras.push({ pack: pk, kind: 'missed', note: 'Missed at ' + T.facShort(d.dest) + ' — unloaded here' });
      return { result: 'missed', msg: 'Packet missed at its destination (' + T.facShort(d.dest) + ') — unload and record' };
    }
    if (d) { s.extras.push({ pack: pk, kind: 'trip-extra', note: 'Not on this trip\'s manifest' }); return { result: 'extra', msg: 'Trip extra — pack of docket ' + T.fmtDocket(d.no) + ' is not on this manifest. Unload and record.' }; }
    s.extras.push({ pack: pk, kind: 'unknown', note: 'Unknown pack number' }); return { result: 'unknown', msg: 'Unknown pack — not in the docket register. Recorded as extra.' };
  };
  T.declareShort = function (L, idx, pk, found) {
    var s = L.exec.stops[idx], ex = s.shorts.filter(function (q) { return q.pack === pk; })[0];
    if (!ex) { ex = { pack: pk, status: 'short', at: Date.now() }; s.shorts.push(ex); }
    if (found) { ex.status = 'found-later'; } else { ex.status = 'short'; }
    return ex;
  };
  T.candidatesToLoad = function (L, idx) {
    var code = L.path[idx];
    return L.manifest.map(T.docketByNo).filter(function (d) { return d && (d.loadAt || d.loc) === code; });
  };
  T.packsToLoad = function (L, idx) {
    var s = L.exec.stops[idx], out = [];
    T.candidatesToLoad(L, idx).forEach(function (d) { T.packsOf(d).forEach(function (pk) { if (s.loaded.indexOf(pk) < 0) out.push(pk); }); });
    return out;
  };
  // LIFO check: the pack's destination index must not be nearer than any remaining (unloaded-yet) pack's destination
  T.scanLoad = function (t, L, idx, pk, overrideReason) {
    pk = String(pk || '').replace(/\s+/g, ''); var x = L.exec, s = x.stops[idx];
    if (!pk) return { result: 'empty', msg: 'Enter or scan a pack number' };
    if (s.loaded.indexOf(pk) > -1) return { result: 'dup', msg: 'Already loaded' };
    var rem = T.packsToLoad(L, idx), d = T.docketByPack(pk);
    if (rem.indexOf(pk) < 0) return { result: 'reject', msg: d ? 'REJECT — pack is not on this stop\'s load list (docket ' + T.fmtDocket(d.no) + ')' : 'REJECT — unknown pack' };
    var di = L.path.indexOf(d.dest), farther = rem.some(function (q) { var dq = T.docketByPack(q); return dq && L.path.indexOf(dq.dest) > di; });
    if (farther && !overrideReason) return { result: 'lifo', msg: 'LIFO — packs for a farther stop are still on the floor. Load those first, or override with a reason.' };
    var tot = x.onboard.reduce(function (sum, q) { var dd = T.docketByPack(q); return sum + (dd ? dd.actWt / dd.packs : 0); }, 0) + d.actWt / d.packs;
    if (tot > T.vtype(t.vehicleType).capKg) return { result: 'reject', msg: 'REJECT — would exceed vehicle payload (' + T.vtype(t.vehicleType).capKg + ' kg)' };
    s.loaded.push(pk); x.onboard.push(pk); d.status = 'On trip'; d.loc = L.path[idx];
    if (farther && overrideReason) s.overrides.push({ pack: pk, reason: overrideReason, at: Date.now() });
    return { result: 'ok', msg: 'Loaded · ' + T.fmtDocket(d.no) + ' → ' + T.facShort(d.dest) + (farther ? ' (LIFO override logged)' : '') };
  };
  T.departStop = function (t, L, idx) {
    var x = L.exec, s = x.stops[idx]; s.departedAt = Date.now(); x.phase = 'enroute'; x.started = true;
    L.manifest.forEach(function (n) { var d = T.docketByNo(n); if (d && x.onboard.some(function (pk) { return pk.indexOf(n) === 0; })) d.status = 'On trip'; });
    x.log.push({ at: Date.now(), msg: 'Gate OUT · ' + T.facLabel(L.path[idx]) + ' → ' + T.facLabel(L.path[idx + 1]) });
  };

  T.cewbStale = function (t, L) { return !!(L.cewb && t.vehicle && L.cewb.vehicle !== t.vehicle.regNo); };
  T.otaFlag = function (st) { if (!st || !st.arrivedAt || !st.schArr) return 'na'; return st.arrivedAt <= st.schArr + 30 * 60000 ? 'on-time' : 'delayed'; };
  // demo helper: run every remaining intermediate stop (scan-all, LIFO load, re-manifest, seal, depart) until the final hub
  T.fastForward = function (t, L) {
    var x = L.exec, last = L.path.length - 1, guard = 0;
    while (x.idx < last && guard++ < 20) {
      var i = x.idx, s = x.stops[i];
      s.steps.arrive = true; s.steps.bay = true;
      if (i > 0) { T.expectedUnload(L, i).forEach(function (pk) { T.scanUnload(L, i, pk); }); s.steps.unload = true; s.steps.reconcile = true; s.steps.putaway = true; }
      var rem = T.packsToLoad(L, i).sort(function (a, b) { return L.path.indexOf(T.docketByPack(b).dest) - L.path.indexOf(T.docketByPack(a).dest); });
      rem.forEach(function (pk) { T.scanLoad(t, L, i, pk); }); s.steps.load = true;
      if (i > 0) T.generateCEWB(t, L, 'Re-manifest at ' + T.facShort(L.path[i]), T.onboardDockets(L));
      s.steps.cewb = true; s.seal = { otl: 'OTL-' + (550000 + Math.floor(Math.random() * 9999)), digi: 'DL-' + (70000 + Math.floor(Math.random() * 9999)) }; s.steps.seal = true; s.steps.depart = true;
      T.departStop(t, L, i);
      T.arriveStop(t, L, i + 1, false); x.stops[i + 1].arrivedAt = Date.now();
    }
    var fs = x.stops[last]; fs.steps.arrive = true; L.arrival = L.arrival || { reachedAt: Date.now(), steps: {} };
  };

  // ------------------------------------------------------------------ seed trips at each stage
  function cftReady(L) { return L; }
  function addAll(t, L, filter) { T.legDockets({ manifest: [] }); T.dockets.filter(function (d) { return d.status === 'At hub' && T.eligible(L, d) && (!filter || filter(d)); }).forEach(function (d) { T.addToManifest(t, L, d); }); }
  function priceOf(t, L) {
    var km = T.pathKm(L.path), ds = T.legDockets(L), chg = ds.reduce(function (s, d) { return s + d.chargeWt; }, 0);
    var pc = T.partnerCost({ vehicleType: t.vehicleType, sourcing: t.sourcing, km: km, method: 'km', stops: L.path.length, chargedKg: chg });
    return pc;
  }
  function assign(t, vid, thcAmt) {
    var v = T.vehicleById(vid), d = T.driverById(v.driver);
    t.vehicle = { id: v.id, regNo: v.regNo, type: v.type, own: v.own, vendor: v.vendor }; t.vehicleType = v.type; t.sourcing = v.own; t.driver1 = d.id;
    var vendorType = v.own === 'Market' ? 'MKT National' : (v.own === 'Owned' ? 'Owned' : 'NVP');
    t.thc = { no: 'THC-' + (thcSeq++), vendorType: vendorType, amount: thcAmt, status: 'Generated', at: NOW - 3 * H, approval: vendorType === 'MKT National' ? 'Approved by ZBM (OTP)' : null };
    v.status = 'Assigned';
  }
  function tripSeed(o) {
    var path = o.path, t = T.newTrip({ id: o.id, path: path, depart: NOW + o.departH * H, twoWay: o.twoWay, laneSno: o.lane, type: o.type, sourcing: 'Vendor', vehicleType: o.vt || T.VTYPES[2].type, client: 'Network line-haul' });
    return t;
  }
  (function seedTrips() {
    var L1 = NET.lanes[0].path.filter(Boolean);   // GGN JAI AMD VAP BOM
    var L2 = NET.lanes[1].path.filter(Boolean).map(function (c) { return c; }); // GGN NGP HYD BLR
    var L4 = NET.lanes[3].path.filter(Boolean);
    var L5 = NET.lanes[4].path.filter(Boolean);
    var L6 = NET.lanes[5].path.filter(Boolean);

    // TRP-2601 · route planned, nothing else (Vehicle Assign demo)
    var t1 = T.newTrip({ path: L1, depart: NOW + 20 * H, twoWay: true, laneSno: 1, type: 'PitStop Circular' }); // id TRP-2601
    t1.vehicleType = T.VTYPES[3].type; t1.sourcing = 'Vendor';
    t1.pricing = { thc: priceOf({ vehicleType: t1.vehicleType, sourcing: 'Vendor' }, T.cur(t1)).thc };
    // TRP-2602 · vehicle assigned, partially manifested (Manifest demo)
    var t2 = T.newTrip({ path: L2, depart: NOW + 26 * H, twoWay: false, laneSno: 2, type: 'PitStop 1Way' });
    t2.vehicleType = T.VTYPES[2].type; assign(t2, 'V02', 0);
    t2.thc.amount = priceOf(t2, T.cur(t2)).thc; t2.pricing = { thc: t2.thc.amount };
    [0, 1, 2, 3, 4, 5, 6, 7].forEach(function () { var cand = T.dockets.filter(function (d) { return d.status === 'At hub' && d.loc === 'GGNT1' && T.eligible(T.cur(t2), d); })[0]; if (cand) T.addToManifest(t2, T.cur(t2), cand); });
    // TRP-2605 · manifest locked, CEWB pending (CEWB demo) — lane 4 BOM→…→GGN, with to-fro on lane 1 stock
    var t5 = T.newTrip({ id: 'TRP-2605', path: L4, depart: NOW + 8 * H, twoWay: false, laneSno: 4, type: 'PitStop 1Way' });
    t5.vehicleType = T.VTYPES[2].type; assign(t5, 'V05', 0);
    t5.thc.amount = priceOf(t5, T.cur(t5)).thc; t5.pricing = { thc: t5.thc.amount };
    T.dockets.filter(function (d) { return d.loc === 'BOMT1' && d.grp === 'A' && d.status === 'At hub'; }).forEach(function (d) { T.addToManifest(t5, T.cur(t5), d); });
    T.cur(t5).locked = true; T.cur(t5).mnfNo = 'MNF-2610-' + pad(mnfSeq++, 4);
    // TRP-2603 · in transit, standing at Hyderabad (pit-stop) — Scan→Descan demo (BOM→HYD→BLR)
    var t3 = T.newTrip({ id: 'TRP-2603', path: L6, depart: NOW - 16 * H, twoWay: false, laneSno: 6, type: 'PitStop 1Way' });
    t3.vehicleType = T.VTYPES[2].type; assign(t3, 'V07', 0);
    var l3 = T.cur(t3);
    T.dockets.filter(function (d) { return d.loc === 'BOMT1' && ['HYDT1', 'BLRT1'].indexOf(d.dest) > -1 && T.eligible(l3, d); }).forEach(function (d) { T.addToManifest(t3, l3, d); });
    t3.thc.amount = priceOf(t3, l3).thc; t3.pricing = { thc: t3.thc.amount };
    // pit-stop stock at HYD joins the manifest (picked up en route)
    T.dockets.filter(function (d) { return d.loc === 'HYDT1' && d.dest === 'BLRT1'; }).forEach(function (d) { T.addToManifest(t3, l3, d); });
    l3.locked = true; l3.mnfNo = 'MNF-2610-' + pad(mnfSeq++, 4); T.generateCEWB(t3, l3, 'Initial generation');
    T.initExec(t3, l3);
    // origin: all origin packs scanned + departed
    var so = l3.exec.stops[0]; ['arrive', 'bay', 'load', 'cewb', 'seal', 'depart'].forEach(function (k) { so.steps[k] = true; }); so.seal = { otl: 'OTL-558201', digi: 'DL-77120' };
    T.candidatesToLoad(l3, 0).forEach(function (d) { T.packsOf(d).forEach(function (pk) { so.loaded.push(pk); l3.exec.onboard.push(pk); d.status = 'On trip'; }); });
    T.departStop(t3, l3, 0);
    T.arriveStop(t3, l3, 1, false); l3.exec.stops[1].arrivedAt = NOW - 25 * 60000;
    l3.exec.stops[1].steps.arrive = true;
    // TRP-2604 · reached final hub (GGN→LKO) with return stock at LKO (Final Arrival + to-fro demo)
    var t4 = T.newTrip({ id: 'TRP-2604', path: L5, depart: NOW - 9 * H, twoWay: true, laneSno: 5, type: 'P2P 2Way' });
    t4.vehicleType = T.VTYPES[1].type; assign(t4, 'V03', 0);
    var l4 = T.cur(t4);
    T.dockets.filter(function (d) { return d.loc === 'GGNT1' && d.dest === 'LKOT1'; }).forEach(function (d) { T.addToManifest(t4, l4, d); });
    t4.thc.amount = priceOf(t4, l4).thc; t4.pricing = { thc: t4.thc.amount };
    l4.locked = true; l4.mnfNo = 'MNF-2610-' + pad(mnfSeq++, 4); T.generateCEWB(t4, l4, 'Initial generation');
    T.initExec(t4, l4);
    var s0 = l4.exec.stops[0]; ['arrive', 'bay', 'load', 'cewb', 'seal', 'depart'].forEach(function (k) { s0.steps[k] = true; }); s0.seal = { otl: 'OTL-558307', digi: 'DL-77154' };
    T.candidatesToLoad(l4, 0).forEach(function (d) { T.packsOf(d).forEach(function (pk) { s0.loaded.push(pk); l4.exec.onboard.push(pk); d.status = 'On trip'; }); });
    T.departStop(t4, l4, 0);
    T.arriveStop(t4, l4, 1, false); l4.exec.stops[1].arrivedAt = NOW - 40 * 60000; l4.exec.stops[1].steps.arrive = true;
    // return-leg manifest from LKO stock
    var lr = t4.leg.ret;
    T.dockets.filter(function (d) { return d.loc === 'LKOT1' && d.dest === 'GGNT1'; }).forEach(function (d) { T.addToManifest(t4, lr, d); });
    l4.arrival = { reachedAt: NOW - 40 * 60000, steps: {} };
    tripSeq = 2606;
    T.trips.sort(function (a, b) { return a.id < b.id ? -1 : 1; });
    T.sel = 'TRP-2601';
  })();

  // ------------------------------------------------------------------ shared UI blocks
  var CSS = [
    '.lt4-wrap{display:flex;flex-direction:column;gap:18px}',
    '.lt4-stagebar{display:flex;align-items:stretch;gap:0;flex-wrap:wrap;background:#fff;border:1px solid rgba(226,232,240,.8);border-radius:16px;padding:10px;box-shadow:0 1px 2px #0f172a0a}',
    '.lt4-b1{display:flex;align-items:center;gap:8px;padding:6px 12px;border:1.5px dashed #cbd5e1;border-radius:12px;background:#f8fafc;color:#94a3b8;font-size:11.5px;font-weight:600;margin-right:10px;max-width:300px;line-height:1.25}',
    '.lt4-b1 small{display:block;font-size:9.5px;font-weight:500;letter-spacing:.03em;text-transform:uppercase}',
    '.lt4-arrow{display:flex;align-items:center;color:#cbd5e1;font-size:15px;margin:0 6px 0 0}',
    '.lt4-st{display:flex;align-items:center;gap:8px;padding:7px 12px;border-radius:12px;border:0;background:transparent;cursor:pointer;font-size:12px;font-weight:600;color:#64748b;white-space:nowrap}',
    '.lt4-st:hover{background:#f1f5f9}',
    '.lt4-st i{font-style:normal;width:22px;height:22px;border-radius:999px;display:inline-flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;background:#f1f5f9;color:#94a3b8;border:2px solid #e2e8f0}',
    '.lt4-st.done i{background:#047857;color:#fff;border-color:#047857}',
    '.lt4-st.cur{background:#fff3ed;color:#B8410E}',
    '.lt4-st.cur i{background:#D94F1C;color:#fff;border-color:#D94F1C}',
    '.lt4-grid{display:grid;gap:16px;align-items:start}',
    '.lt4-g2{grid-template-columns:1.25fr 1fr}.lt4-g3{grid-template-columns:repeat(3,1fr)}.lt4-g4{grid-template-columns:repeat(4,1fr)}.lt4-g21{grid-template-columns:2fr 1fr}',
    '@media(max-width:1000px){.lt4-g2,.lt4-g3,.lt4-g4,.lt4-g21{grid-template-columns:1fr}}',
    '.lt4-kpi{padding:12px 14px;border-radius:14px;border:1px solid rgba(226,232,240,.8);background:#fff}',
    '.lt4-kpi b{display:block;font-size:19px;font-weight:600;color:#0f172a;font-variant-numeric:tabular-nums}',
    '.lt4-kpi span{font-size:10.5px;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8}',
    '.lt4-kpi em{display:block;font-style:normal;font-size:11.5px;color:#64748b;margin-top:2px}',
    '.lt4-kpi.good b{color:#047857}.lt4-kpi.bad b{color:#b91c1c}.lt4-kpi.warn b{color:#b45309}',
    '.lt4-chip{display:inline-flex;align-items:center;gap:5px;border-radius:999px;padding:3px 10px;font-size:11.5px;font-weight:600;background:#f1f5f9;color:#475569;border:1px solid transparent;white-space:nowrap}',
    '.lt4-chip.btn{cursor:pointer;background:#fff;border-color:#e2e8f0}.lt4-chip.btn:hover{border-color:#D94F1C;color:#B8410E}',
    '.lt4-chip.green{background:#ecfdf5;color:#047857}.lt4-chip.amber{background:#fffbeb;color:#b45309}.lt4-chip.red{background:#fef2f2;color:#b91c1c}.lt4-chip.blue{background:#eff6ff;color:#1d4ed8}.lt4-chip.ph{background:#f8fafc;color:#94a3b8;border:1px dashed #cbd5e1}',
    '.lt4-path{display:flex;align-items:center;flex-wrap:wrap;gap:4px 0}',
    '.lt4-node{display:flex;flex-direction:column;align-items:center;min-width:92px;padding:6px 8px;border-radius:12px;border:1.5px solid #e2e8f0;background:#fff;font-size:11.5px;font-weight:600;color:#0f172a;text-align:center}',
    '.lt4-node small{font-weight:500;color:#94a3b8;font-size:10px}',
    '.lt4-node.org{border-color:#D94F1C}.lt4-node.dst{border-color:#047857}.lt4-node.cur{background:#fff3ed;border-color:#D94F1C;box-shadow:0 0 0 3px rgba(217,79,28,.12)}.lt4-node.done{background:#f0fdf4;border-color:#a7f3d0}',
    '.lt4-link{display:flex;flex-direction:column;align-items:center;min-width:54px;font-size:10px;color:#94a3b8}',
    '.lt4-link:before{content:"";display:block;height:2px;width:100%;background:#cbd5e1;margin-bottom:2px}',
    '.lt4-link.done:before{background:#047857}',
    '.lt4-tbl-wrap{overflow-x:auto}',
    '.lt4-num{font-variant-numeric:tabular-nums;text-align:right}',
    '.lt4-bar{height:9px;border-radius:99px;background:#f1f5f9;overflow:hidden}.lt4-bar>div{height:100%;background:#047857;border-radius:99px}.lt4-bar>div.warn{background:#d97706}.lt4-bar>div.over{background:#dc2626}',
    '.lt4-note{font-size:12px;color:#64748b;line-height:1.5}',
    '.lt4-ph-card{border:1.5px dashed #cbd5e1;border-radius:14px;background:#f8fafc;padding:12px 14px;display:flex;flex-direction:column;gap:4px}',
    '.lt4-ph-card b{font-size:12.5px;color:#475569}.lt4-ph-card span{font-size:11px;color:#94a3b8}',
    '.lt4-scan{display:flex;gap:8px}.lt4-scan input{flex:1}',
    '.lt4-feed{display:flex;flex-direction:column;gap:6px;max-height:230px;overflow-y:auto}',
    '.lt4-feed>div{font-size:12px;padding:6px 10px;border-radius:9px;background:#f8fafc;color:#334155}',
    '.lt4-feed>div.ok{background:#ecfdf5;color:#065f46}.lt4-feed>div.bad{background:#fef2f2;color:#991b1b}.lt4-feed>div.warn{background:#fffbeb;color:#92400e}',
    '.lt4-truck{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;max-width:420px}',
    '.lt4-cell{min-height:58px;border:1.5px solid #e2e8f0;border-radius:10px;background:#f8fafc;padding:5px 7px;font-size:10.5px;color:#475569;display:flex;flex-direction:column;gap:2px}',
    '.lt4-cell b{font-size:9.5px;color:#94a3b8;letter-spacing:.06em}',
    '.lt4-steps{display:flex;flex-wrap:wrap;gap:6px}',
    '.lt4-step{display:flex;align-items:center;gap:6px;padding:5px 11px;border-radius:999px;border:1.5px solid #e2e8f0;background:#fff;font-size:11.5px;font-weight:600;color:#94a3b8}',
    '.lt4-step.done{background:#ecfdf5;border-color:#a7f3d0;color:#047857}.lt4-step.cur{background:#fff3ed;border-color:#D94F1C;color:#B8410E}',
    '.lt4-sel{display:flex;gap:10px;align-items:center;flex-wrap:wrap}',
    '.lt4-sel select{width:auto;min-width:260px}',
    '.lt4-hr{height:1px;background:#f1f5f9;margin:4px 0}',
    '.lt4-two{display:flex;justify-content:space-between;gap:12px;font-size:13px;color:#475569;padding:4px 0}',
    '.lt4-two.tot{border-top:1px solid #e2e8f0;margin-top:4px;padding-top:8px;font-weight:700;color:#0f172a}',
    '.lt4-pill-ok{color:#047857}.lt4-pill-bad{color:#b91c1c}.lt4-pill-warn{color:#b45309}'
  ].join('\n');
  (function injectCss() { try { if (document.querySelector('style[data-lt4="1"]')) return; var st = document.createElement('style'); st.setAttribute('data-lt4', '1'); st.textContent = CSS; document.head.appendChild(st); } catch (x) { } })();

  var ui = {};
  ui.Chip = function (label, tone, title) { return e('span', { className: 'lt4-chip ' + (tone || ''), title: title || null }, label); };
  ui.Kpi = function (label, value, sub, tone) { return e('div', { className: 'lt4-kpi ' + (tone || '') }, e('span', null, label), e('b', null, value), sub ? e('em', null, sub) : null); };
  ui.Card = function (title, right, body, extra) {
    return e('div', { className: 'lt2-card', style: extra && extra.style }, e('div', { className: 'lt2-card-head' }, e('span', { className: 'lt2-card-title' }, title), right || null), e('div', { className: 'lt2-card-body' }, body));
  };
  ui.Two = function (k, v, tot) { return e('div', { className: 'lt4-two' + (tot ? ' tot' : '') }, e('span', null, k), e('span', { className: 'lt4-num' }, v)); };
  ui.Bar = function (pct, label) { var tone = pct > 100 ? 'over' : (pct > 90 ? 'warn' : ''); return e('div', null, label ? e('div', { className: 'lt2-muted', style: { marginBottom: 3 } }, label) : null, e('div', { className: 'lt4-bar' }, e('div', { className: tone, style: { width: Math.min(100, pct) + '%' } }))); };
  ui.Header = function (title, sub) { return e('div', null, e('h1', { className: 'lt2-h1' }, title), e('p', { className: 'lt2-sub' }, sub)); };
  ui.Empty = function (msg) { return e('div', { className: 'lt2-empty' }, msg); };
  ui.Path = function (path, o) {
    o = o || {}; var kids = [];
    path.forEach(function (c, i) {
      var cls = 'lt4-node' + (i === 0 ? ' org' : '') + (i === path.length - 1 ? ' dst' : '') + (o.cur === i ? ' cur' : '') + (o.cur != null && i < o.cur ? ' done' : '');
      var f = T.fac(c);
      kids.push(e('div', { key: 'n' + i, className: cls }, e('span', null, f ? f.city : c), e('small', null, c + (f ? ' · ' + f.tier : '')), o.sub ? e('small', null, o.sub(i, c)) : null));
      if (i < path.length - 1) kids.push(e('div', { key: 'l' + i, className: 'lt4-link' + (o.cur != null && i < o.cur ? ' done' : '') }, T.legKm(c, path[i + 1]) + ' km'));
    });
    return e('div', { className: 'lt4-path' }, kids);
  };
  // 1B placeholders (teammate) → hand-off → 1A stages
  T.B1 = [
    ['Pickup ID generate', 'Pickup IDs created per consignor request'], ['Pickup ID summation = PRS', 'Pickups summed into a Pickup Run Sheet'],
    ['PRS → serviceable partner', 'PRS allocated to the serviceable partner'], ['Partner uses app', 'Partner opens the PRS in the partner app'],
    ['Partner fills docket details', 'Partner creates the docket in-app'], ['Partner prints labels', 'Pack labels printed'], ['Partner scans labels', 'Labels scanned onto packs'],
    ['Pickup done', 'PRS pickup completed'], ['Reached mini-hub', 'Vehicle reaches the mini-hub'], ['Drop scan at mini-hub', 'Packs drop-scanned → docket stock at hub']
  ];
  ui.StageBar = function (t, current) {
    var stg = t ? T.stageOf(t) : 0, kids = [];
    kids.push(e('div', { key: 'b1', className: 'lt4-b1', title: 'Owned by a teammate (1B) — shown as a placeholder only. 1A starts from docket stock at the hub.' }, e('span', null, '⧉'), e('span', null, e('small', null, '1B · teammate · placeholder'), 'Pickup → PRS → partner → drop scan')));
    kids.push(e('div', { key: 'ar', className: 'lt4-arrow' }, '▸'));
    T.STAGES.forEach(function (s) {
      var cls = 'lt4-st' + (s.n === current ? ' cur' : '') + (t && s.n < stg ? ' done' : '');
      kids.push(e('button', { key: 's' + s.n, type: 'button', className: cls, onClick: function () { T.go(s.path, t && t.id); } }, e('i', null, (t && s.n < stg) ? '✓' : String(s.n)), s.name));
    });
    return e('div', { className: 'lt4-stagebar' }, kids);
  };
  ui.TripPicker = function (t, filter, extra) {
    var list = T.trips.filter(function (x) { return !filter || filter(x); });
    return e('div', { className: 'lt4-sel' },
      e('label', { className: 'lt2-label' }, 'Trip'),
      e('select', { className: 'lt2-select', value: t ? t.id : '', onChange: function (ev) { T.sel = ev.target.value; T.go(T.curPath(), ev.target.value); T.emit(); } },
        list.map(function (x) { return e('option', { key: x.id, value: x.id }, x.id + ' · ' + T.facShort(x.leg.fwd.path[0]) + ' → ' + T.facShort(x.leg.fwd.path[x.leg.fwd.path.length - 1]) + ' · ' + T.stageLabel(x)); })),
      t ? ui.Chip(T.stageLabel(t), 'blue') : null, extra || null);
  };
  ui.Money = inr;
  T.THC_SEQ = function () { return thcSeq++; };
  T.MNF_SEQ = function () { return mnfSeq++; };
  T.TRIP_SEQ = function () { return tripSeq; };
  T.checkDigit = checkDigit;
  T.hash = hash;
export { T, ui }
