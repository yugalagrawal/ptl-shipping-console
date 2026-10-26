import { useLocation, useNavigate, Link } from 'react-router-dom'
import { T } from '../ops/core.js'
import { useDispatch } from './store.js'
import { BASE, PageHead, Flow, Chip, Chain, Stage, Section, Util, btnPrimary, btnGhost, th, td, dt, city, kg, inr } from './ui.jsx'
import { card } from '../../../components/ui.js'

const Row = ({ k, v }) => <div className="flex justify-between gap-3 py-1 text-xs"><span className="text-slate-500">{k}</span><span className="text-right font-medium text-slate-800">{v}</span></div>

function Doc({ t, a }) {
  const m = t.money, v = t.vehicle
  return (
    <div id="thc-doc" className={`p-5 ${card}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-3">
        <div>
          <p className="text-[11px] font-medium uppercase tracking-wider text-slate-400">Trip Hire Challan</p>
          <p className="text-xl font-semibold text-slate-900">{t.thc ? t.thc.no : 'Draft'}</p>
          <p className="text-[11px] text-slate-500">{t.id} · {t.thc ? 'Issued ' + dt(t.thc.issuedAt) : 'Not issued yet'}</p>
        </div>
        <div className="flex items-center gap-2"><Stage s={t.stage} />
          {t.thc && <button onClick={() => window.print()} className={btnGhost}>Print</button>}
        </div>
      </div>

      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Vehicle</p>
          {v ? <><Row k="Registration" v={v.regNo} /><Row k="Type" v={v.type} /><Row k="Owner" v={v.own} />{v.vendor && <Row k="Vendor" v={v.vendor} />}</> : <p className="text-xs text-red-600">No vehicle assigned</p>}
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Driver</p>
          {t.driver ? <><Row k="Name" v={t.driver.name} /><Row k="Mobile" v={t.driver.mobile} /><Row k="Licence" v={t.driver.licence} /></> : <p className="text-xs text-slate-500">{v && v.own === 'Market' ? 'Added when the spot vehicle is confirmed' : 'Not recorded'}</p>}
        </div>
        <div>
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Load</p>
          <Row k="Dockets" v={t.items.length} /><Row k="Weight" v={kg(t.kg)} /><Row k="Utilization" v={<Util v={t.util} />} /><Row k="Manifests" v={t.manifests.length} />
        </div>
      </div>

      <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Route and schedule · {t.km} km</p>
      <table className="w-full text-left text-xs">
        <thead><tr className="border-b border-slate-200 text-[11px] text-slate-400"><th className={th}>Stop</th><th className={th}>Arrive</th><th className={th}>Depart</th></tr></thead>
        <tbody>{t.schedule.map((x, i) => <tr key={x.code} className="border-b border-slate-100"><td className={`${td} font-medium text-slate-800`}>{T.facLabel(x.code)}{i === 0 && <span className="ml-1 text-[10px] text-slate-400">origin</span>}</td><td className={td}>{x.arr ? dt(x.arr) : '—'}</td><td className={td}>{x.dep ? dt(x.dep) : '—'}</td></tr>)}</tbody>
      </table>

      <p className="mb-1 mt-4 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Manifests on this vehicle</p>
      <table className="w-full text-left text-xs">
        <thead><tr className="border-b border-slate-200 text-[11px] text-slate-400"><th className={th}>Manifest</th><th className={th}>From → Unload at</th><th className={`${th} text-right`}>Dockets</th><th className={`${th} text-right`}>Packs</th><th className={`${th} text-right`}>Weight</th><th className={`${th} text-right`}>E-way bills</th></tr></thead>
        <tbody>
          {t.manifests.map((x) => <tr key={x.key} className="border-b border-slate-100"><td className={`${td} font-medium text-slate-800`}>{x.no}</td><td className={td}>{city(t.entry)} → {city(x.exit)}</td><td className={`${td} text-right tabular-nums`}>{x.dockets.length}</td><td className={`${td} text-right tabular-nums`}>{x.packs}</td><td className={`${td} text-right tabular-nums`}>{kg(x.kg)}</td><td className={`${td} text-right tabular-nums`}>{x.ewb}</td></tr>)}
          <tr className="font-semibold text-slate-900"><td className="py-2 pr-3" colSpan={2}>Total</td><td className="py-2 pr-3 text-right tabular-nums">{t.items.length}</td><td className="py-2 pr-3 text-right tabular-nums">{t.packs}</td><td className="py-2 pr-3 text-right tabular-nums">{kg(t.kg)}</td><td className="py-2 pr-3 text-right tabular-nums">{t.ewb}</td></tr>
        </tbody>
      </table>

      <div className="mt-4 grid gap-4 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Hire terms <span className="font-normal normal-case text-slate-400">(sample rates)</span></p>
          {m.hired ? <>
            <Row k="Freight" v={inr(m.freight)} /><Row k="TDS 1%" v={'− ' + inr(m.tds)} /><Row k="Net payable" v={inr(m.net)} />
            <Row k="Advance 70% (on dispatch)" v={inr(m.advance)} /><Row k="Balance (on POD)" v={inr(m.balance)} /><Row k="Toll, reimbursed" v={inr(m.toll)} />
          </> : <><p className="text-xs text-slate-500">Own fleet: no hire is paid. The trip cost is used for costing only.</p><Row k="Trip cost (notional)" v={inr(m.notional)} /><Row k="Toll" v={inr(m.toll)} /></>}
        </div>
        <div className="rounded-xl border border-slate-200 p-3">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wider text-slate-400">Consolidated e-way bill</p>
          {t.cewb ? <>
            <Row k="E-way bills" v={`${t.cewb.count} of ${t.items.length} dockets`} /><Row k="CEWB" v={t.locked ? <span className="tabular-nums">{t.cewb.no}{t.cewb.docs > 1 ? ` (+${t.cewb.docs - 1} more)` : ''}</span> : <Chip tone="amber">auto at manifest lock</Chip>} />
            <p className="mt-1 text-[11px] leading-snug text-slate-500">Generated automatically when the manifests are locked, because at least one docket has an e-way bill. Vehicle: {v ? v.regNo : '—'}.</p>
          </> : <p className="text-xs text-slate-500">No docket on this trip has an e-way bill, so no CEWB is needed.</p>}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-3 print:hidden">
        {!t.locked && <Link to={`${BASE}/manifests`} className={btnGhost}>Lock manifests first</Link>}
        {t.locked && !t.thc && <><button onClick={() => a.unlock(t.key)} className={btnGhost}>Unlock manifests</button><button onClick={() => a.issue(t.key)} className={btnPrimary}>Issue THC</button></>}
        {t.thc && !t.thc.dispatchedAt && <button onClick={() => a.dispatch(t.key)} className={btnPrimary}>Dispatch vehicle</button>}
        {t.thc && t.thc.dispatchedAt && <Chip tone="dark">Dispatched {dt(t.thc.dispatchedAt)}</Chip>}
      </div>
    </div>
  )
}

export default function DispatchThc() {
  const { s, p, a } = useDispatch()
  const nav = useNavigate()
  const q = new URLSearchParams(useLocation().search).get('trip')
  const trips = p.trips
  const cur = trips.find((t) => t.key === q) || trips.find((t) => t.thc) || trips.find((t) => t.locked) || trips[0]
  const ready = trips.filter((t) => t.locked && !t.thc).length
  return (
    <div className="max-w-6xl space-y-4">
      <PageHead title="THC (Trip Hire Challan)" sub="The THC is the vehicle-level document: one per vehicle trip. It collects every manifest on that vehicle with its route, driver and hire terms. Issue it once the manifests are locked, then dispatch."
        right={<button onClick={a.issueAll} disabled={!ready} className={btnPrimary}>Issue {ready} ready</button>} />
      <Flow p={p} s={s} at="thc" />
      <div className="grid gap-4 lg:grid-cols-5">
        <div className="lg:col-span-2">
          <Section title={`${trips.length} vehicle trips`} sub="Pick one to see its THC.">
            <div className="max-h-[40rem] space-y-1.5 overflow-auto">
              {trips.map((t) => (
                <button key={t.key} onClick={() => nav(`${BASE}/thc?trip=${encodeURIComponent(t.key)}`)} className={`w-full rounded-xl border px-3 py-2 text-left ${cur && cur.key === t.key ? 'border-slate-900 bg-slate-50' : 'border-slate-200 hover:bg-slate-50'}`}>
                  <div className="flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-900">{t.thc ? t.thc.no : t.id}</span><Stage s={t.stage} /></div>
                  <div className="mt-1"><Chain path={t.path} /></div>
                  <p className="mt-0.5 text-[10px] text-slate-400">{t.vehicle ? t.vehicle.regNo : 'no vehicle'} · {t.manifests.length} manifest{t.manifests.length === 1 ? '' : 's'} · {kg(t.kg)}</p>
                </button>
              ))}
            </div>
          </Section>
        </div>
        <div className="lg:col-span-3">{cur ? <Doc t={cur} a={a} /> : null}</div>
      </div>
    </div>
  )
}
