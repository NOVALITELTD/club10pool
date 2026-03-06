'use client'
import { useState } from 'react'

const MOCK_STATS = {
  totalMembers: 24, activeBatches: 2, formingBatches: 1,
  closedBatches: 3, totalCapitalDeployed: 680,
  pendingWithdrawals: 2, pendingPayouts: 20, totalProfitDistributed: 312.50,
}
const MOCK_BATCHES = [
  { id:'1', name:'Batch A', status:'ACTIVE', targetMembers:10, capitalPerMember:10, totalCapital:100, tradingPlatform:'MT5', managementFeePercent:5, _count:{batchMembers:10}, lastResult:{netProfit:47.50, profitPercent:47.50} },
  { id:'2', name:'Batch B', status:'FORMING', targetMembers:10, capitalPerMember:20, totalCapital:200, tradingPlatform:'MT5', managementFeePercent:5, _count:{batchMembers:5}, lastResult:null },
  { id:'3', name:'Batch C', status:'ACTIVE', targetMembers:8, capitalPerMember:50, totalCapital:400, tradingPlatform:'cTrader', managementFeePercent:5, _count:{batchMembers:8}, lastResult:{netProfit:95.00, profitPercent:23.75} },
  { id:'4', name:'Batch D', status:'CLOSED', targetMembers:6, capitalPerMember:30, totalCapital:180, tradingPlatform:'MT4', managementFeePercent:5, _count:{batchMembers:6}, lastResult:{netProfit:62.10, profitPercent:34.50} },
]
const MOCK_MEMBERS = [
  { id:'1', fullName:'Alice Johnson', email:'alice@example.com', status:'ACTIVE', _count:{batchMembers:2}, createdAt:'2024-01-01' },
  { id:'2', fullName:'Bob Smith', email:'bob@example.com', status:'ACTIVE', _count:{batchMembers:1}, createdAt:'2024-01-01' },
  { id:'3', fullName:'Carol White', email:'carol@example.com', status:'ACTIVE', _count:{batchMembers:2}, createdAt:'2024-01-02' },
  { id:'4', fullName:'David Brown', email:'david@example.com', status:'ACTIVE', _count:{batchMembers:1}, createdAt:'2024-01-03' },
  { id:'5', fullName:'Eva Martinez', email:'eva@example.com', status:'ACTIVE', _count:{batchMembers:3}, createdAt:'2024-01-04' },
  { id:'6', fullName:'Frank Lee', email:'frank@example.com', status:'WITHDRAWN', _count:{batchMembers:1}, createdAt:'2023-12-01' },
]
const MOCK_WITHDRAWALS = [
  { id:'1', member:{fullName:'Bob Smith',email:'bob@example.com'}, batchName:'Batch A', status:'PENDING', requestedAt:'2024-01-28' },
  { id:'2', member:{fullName:'David Brown',email:'david@example.com'}, batchName:'Batch A', status:'PENDING', requestedAt:'2024-01-29' },
  { id:'3', member:{fullName:'Frank Lee',email:'frank@example.com'}, batchName:'Batch D', status:'PROCESSED', requestedAt:'2023-12-28' },
]

type Tab = 'dashboard'|'batches'|'members'|'withdrawals'

export default function Dashboard() {
  const [tab, setTab] = useState<Tab>('dashboard')
  const [showNewBatch, setShowNewBatch] = useState(false)
  const [showNewMember, setShowNewMember] = useState(false)

  return (
    <div style={{display:'flex',minHeight:'100vh',background:'var(--bg)'}}>
      {/* Sidebar */}
      <aside style={{width:240,flexShrink:0,borderRight:'1px solid var(--border)',padding:'28px 16px',display:'flex',flexDirection:'column',gap:4,position:'sticky',top:0,height:'100vh',overflow:'hidden'}}>
        <div style={{padding:'0 10px 24px'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:4}}>
            <div style={{width:32,height:32,borderRadius:8,background:'linear-gradient(135deg,#c9a84c,#a07830)',display:'flex',alignItems:'center',justifyContent:'center',color:'#0a0c0f',fontSize:16,fontWeight:800}}>C</div>
            <div>
              <div style={{fontWeight:800,fontSize:15,letterSpacing:'-0.02em'}}>Club10</div>
              <div style={{fontFamily:'var(--font-mono)',fontSize:10,color:'var(--gold)',letterSpacing:'0.1em'}}>POOL MANAGER</div>
            </div>
          </div>
          <div style={{height:1,background:'linear-gradient(90deg,var(--gold-dim),transparent)',margin:'8px 0 0'}} />
        </div>
        {([
          {id:'dashboard',label:'Dashboard',icon:'▤'},
          {id:'batches',label:'Batches',icon:'⬡'},
          {id:'members',label:'Members',icon:'◎'},
          {id:'withdrawals',label:'Withdrawals',icon:'↓'},
        ] as const).map(({id,label,icon}) => (
          <button key={id} className={`nav-item${tab===id?' active':''}`} onClick={()=>setTab(id)} style={{fontFamily:'var(--font-display)'}}>
            <span style={{fontSize:16}}>{icon}</span>{label}
            {id==='withdrawals'&&MOCK_STATS.pendingWithdrawals>0&&(
              <span style={{marginLeft:'auto',background:'var(--gold)',color:'#0a0c0f',borderRadius:10,fontSize:10,fontWeight:700,padding:'1px 6px',fontFamily:'var(--font-mono)'}}>{MOCK_STATS.pendingWithdrawals}</span>
            )}
          </button>
        ))}
        <div style={{marginTop:'auto'}}>
          <div style={{height:1,background:'var(--border)',margin:'16px 0'}} />
          <button className="nav-item" style={{fontFamily:'var(--font-display)'}}>⚙ Settings</button>
          <div style={{padding:'12px 14px',marginTop:8,background:'var(--surface-2)',borderRadius:8,border:'1px solid var(--border)'}}>
            <div style={{fontSize:12,fontWeight:600}}>Admin</div>
            <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-muted)',marginTop:2}}>admin@club10pool.com</div>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main style={{flex:1,padding:'36px 40px',overflow:'auto'}}>
        {tab==='dashboard'&&<DashboardView />}
        {tab==='batches'&&<BatchesView onNew={()=>setShowNewBatch(true)} />}
        {tab==='members'&&<MembersView onNew={()=>setShowNewMember(true)} />}
        {tab==='withdrawals'&&<WithdrawalsView />}
      </main>

      {showNewBatch&&<NewBatchModal onClose={()=>setShowNewBatch(false)} />}
      {showNewMember&&<NewMemberModal onClose={()=>setShowNewMember(false)} />}
    </div>
  )
}

function DashboardView() {
  return (
    <div>
      <div style={{marginBottom:32}}>
        <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.02em'}}>Overview</h1>
        <p style={{color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontSize:12,marginTop:4}}>{new Date().toLocaleDateString('en-US',{weekday:'long',year:'numeric',month:'long',day:'numeric'})}</p>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:16,marginBottom:24}}>
        <div className="stat-card"><div className="stat-label">Total Members</div><div className="stat-value">{MOCK_STATS.totalMembers}</div><div className="stat-sub">active investors</div></div>
        <div className="stat-card"><div className="stat-label">Capital Deployed</div><div className="stat-value" style={{color:'var(--gold)'}}>${MOCK_STATS.totalCapitalDeployed}</div><div className="stat-sub">across active batches</div></div>
        <div className="stat-card"><div className="stat-label">Profit Distributed</div><div className="stat-value" style={{color:'var(--green)'}}>${MOCK_STATS.totalProfitDistributed}</div><div className="stat-sub">all-time net profit</div></div>
        <div className="stat-card"><div className="stat-label">Pending Payouts</div><div className="stat-value" style={{color:'#e8a84c'}}>{MOCK_STATS.pendingPayouts}</div><div className="stat-sub">awaiting processing</div></div>
      </div>
      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:24}}>
        {[{label:'Active Batches',val:MOCK_STATS.activeBatches,cls:'badge-active'},{label:'Forming Batches',val:MOCK_STATS.formingBatches,cls:'badge-forming'},{label:'Closed Batches',val:MOCK_STATS.closedBatches,cls:'badge-closed'}].map(s=>(
          <div key={s.label} className="card" style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
            <div><div className="stat-label">{s.label}</div><div className="stat-value">{s.val}</div></div>
            <span className={`badge ${s.cls}`}>{s.val>0?'●':'○'}</span>
          </div>
        ))}
      </div>
      <div className="card">
        <h2 style={{fontSize:15,fontWeight:700,marginBottom:16}}>Batch Performance</h2>
        <div className="table-wrap">
          <table>
            <thead><tr><th>Batch</th><th>Members</th><th>Total Capital</th><th>Net Profit</th><th>ROI %</th><th>Status</th></tr></thead>
            <tbody>{MOCK_BATCHES.map(b=>(
              <tr key={b.id}>
                <td style={{color:'var(--text)',fontWeight:600}}>{b.name}</td>
                <td className="mono">{b._count.batchMembers}/{b.targetMembers}</td>
                <td className="mono" style={{color:'var(--gold)'}}>${b.totalCapital}</td>
                <td className="mono">{b.lastResult?<span className="profit-pos">+${b.lastResult.netProfit}</span>:<span style={{color:'var(--text-muted)'}}>—</span>}</td>
                <td className="mono">{b.lastResult?<span className="profit-pos">+{b.lastResult.profitPercent}%</span>:<span style={{color:'var(--text-muted)'}}>—</span>}</td>
                <td><span className={`badge badge-${b.status.toLowerCase()}`}>{b.status}</span></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function BatchesView({onNew}:{onNew:()=>void}) {
  const [filter, setFilter] = useState('ALL')
  const filtered = filter==='ALL'?MOCK_BATCHES:MOCK_BATCHES.filter(b=>b.status===filter)
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
        <div><h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.02em'}}>Batches</h1><p style={{color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontSize:12,marginTop:4}}>{MOCK_BATCHES.length} total batches</p></div>
        <button className="btn btn-primary" onClick={onNew}>+ New Batch</button>
      </div>
      <div style={{display:'flex',gap:8,marginBottom:20}}>
        {['ALL','FORMING','ACTIVE','CLOSED'].map(f=>(
          <button key={f} onClick={()=>setFilter(f)} style={{padding:'6px 14px',borderRadius:6,border:'1px solid var(--border)',background:filter===f?'var(--surface-2)':'transparent',color:filter===f?'var(--text)':'var(--text-muted)',cursor:'pointer',fontSize:12,fontFamily:'var(--font-mono)',fontWeight:500}}>{f}</button>
        ))}
      </div>
      <div style={{display:'grid',gap:16}}>
        {filtered.map(batch=>{
          const fillPct=(batch._count.batchMembers/batch.targetMembers)*100
          return (
            <div key={batch.id} className="card" style={{display:'grid',gridTemplateColumns:'1.2fr 1fr 1fr 1fr auto',alignItems:'center',gap:24}}>
              <div>
                <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:6}}>
                  <span style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>{batch.name}</span>
                  <span className={`badge badge-${batch.status.toLowerCase()}`}>{batch.status}</span>
                </div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-muted)'}}>{batch.tradingPlatform||'No platform'} · {batch.managementFeePercent}% fee</div>
              </div>
              <div>
                <div className="stat-label">Capital</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:18,fontWeight:600,color:'var(--gold)'}}>${batch.totalCapital}</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:11,color:'var(--text-muted)'}}>${batch.capitalPerMember}/member</div>
              </div>
              <div>
                <div className="stat-label">Members</div>
                <div style={{fontFamily:'var(--font-mono)',fontSize:15,fontWeight:600,marginBottom:6}}>{batch._count.batchMembers}<span style={{color:'var(--text-muted)'}}>/{batch.targetMembers}</span></div>
                <div style={{height:4,background:'var(--border)',borderRadius:2,overflow:'hidden'}}><div style={{height:'100%',borderRadius:2,background:fillPct===100?'var(--green)':'var(--gold)',width:`${fillPct}%`}} /></div>
              </div>
              <div>
                <div className="stat-label">Last Result</div>
                {batch.lastResult?<><div className="mono profit-pos" style={{fontSize:16,fontWeight:600}}>+${batch.lastResult.netProfit}</div><div className="mono" style={{fontSize:11,color:'var(--text-muted)'}}>+{batch.lastResult.profitPercent}% ROI</div></>:<div className="mono" style={{color:'var(--text-muted)',fontSize:13}}>No results yet</div>}
              </div>
              <div style={{display:'flex',gap:8}}>
                <button className="btn btn-outline btn-sm">View</button>
                {batch.status==='FORMING'&&<button className="btn btn-primary btn-sm">Activate</button>}
                {batch.status==='ACTIVE'&&<button className="btn btn-outline btn-sm">Settle</button>}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MembersView({onNew}:{onNew:()=>void}) {
  return (
    <div>
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:28}}>
        <div><h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.02em'}}>Members</h1><p style={{color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontSize:12,marginTop:4}}>{MOCK_MEMBERS.filter(m=>m.status==='ACTIVE').length} active investors</p></div>
        <button className="btn btn-primary" onClick={onNew}>+ Add Member</button>
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Member</th><th>Email</th><th>Batches</th><th>Status</th><th>Joined</th><th>Actions</th></tr></thead>
            <tbody>{MOCK_MEMBERS.map(m=>(
              <tr key={m.id}>
                <td style={{color:'var(--text)',fontWeight:600}}>{m.fullName}</td>
                <td className="mono" style={{fontSize:12}}>{m.email}</td>
                <td className="mono">{m._count.batchMembers}</td>
                <td><span className={`badge ${m.status==='ACTIVE'?'badge-active':'badge-closed'}`}>{m.status}</span></td>
                <td className="mono" style={{fontSize:12}}>{new Date(m.createdAt).toLocaleDateString()}</td>
                <td><div style={{display:'flex',gap:6}}><button className="btn btn-outline btn-sm">View</button><button className="btn btn-outline btn-sm">Edit</button></div></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function WithdrawalsView() {
  return (
    <div>
      <div style={{marginBottom:28}}>
        <h1 style={{fontSize:26,fontWeight:800,letterSpacing:'-0.02em'}}>Withdrawal Requests</h1>
        <p style={{color:'var(--text-muted)',fontFamily:'var(--font-mono)',fontSize:12,marginTop:4}}>Members may only withdraw at month-end</p>
      </div>
      {MOCK_WITHDRAWALS.filter(w=>w.status==='PENDING').length>0&&(
        <div style={{background:'rgba(201,168,76,0.08)',border:'1px solid rgba(201,168,76,0.3)',borderRadius:10,padding:'14px 18px',marginBottom:20,display:'flex',alignItems:'center',gap:12}}>
          <span style={{color:'var(--gold)',fontSize:18}}>⚠</span>
          <span style={{fontSize:13,color:'var(--gold)'}}><strong>{MOCK_WITHDRAWALS.filter(w=>w.status==='PENDING').length}</strong> requests pending approval before month-end settlement.</span>
        </div>
      )}
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead><tr><th>Member</th><th>Batch</th><th>Requested</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>{MOCK_WITHDRAWALS.map(w=>(
              <tr key={w.id}>
                <td><div style={{fontWeight:600,color:'var(--text)'}}>{w.member.fullName}</div><div className="mono" style={{fontSize:11,color:'var(--text-muted)',marginTop:2}}>{w.member.email}</div></td>
                <td><span className="badge badge-active" style={{fontSize:11}}>{w.batchName}</span></td>
                <td className="mono" style={{fontSize:12}}>{new Date(w.requestedAt).toLocaleDateString()}</td>
                <td><span className={`badge badge-${w.status.toLowerCase()}`}>{w.status}</span></td>
                <td>{w.status==='PENDING'&&<div style={{display:'flex',gap:6}}>
                  <button style={{background:'rgba(34,201,122,0.12)',color:'var(--green)',border:'1px solid rgba(34,201,122,0.3)',padding:'5px 12px',fontSize:12,borderRadius:6,cursor:'pointer'}}>✓ Approve</button>
                  <button className="btn btn-danger btn-sm">✕ Reject</button>
                </div>}</td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

function Modal({title,onClose,children}:{title:string;onClose:()=>void;children:React.ReactNode}) {
  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.7)',display:'flex',alignItems:'center',justifyContent:'center',zIndex:1000,backdropFilter:'blur(4px)'}}>
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:32,width:480,maxWidth:'90vw'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24}}>
          <h2 style={{fontSize:18,fontWeight:800}}>{title}</h2>
          <button onClick={onClose} className="btn btn-outline btn-sm">✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

function FieldLabel({children}:{children:string}) {
  return <label style={{display:'block',fontSize:12,fontWeight:600,color:'var(--text-muted)',marginBottom:6,fontFamily:'var(--font-mono)',letterSpacing:'0.05em'}}>{children}</label>
}

function NewBatchModal({onClose}:{onClose:()=>void}) {
  return (
    <Modal title="Create New Batch" onClose={onClose}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div><FieldLabel>BATCH NAME</FieldLabel><input className="input" placeholder="e.g. Batch E" /></div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><FieldLabel>TARGET MEMBERS</FieldLabel><input className="input" type="number" placeholder="10" /></div>
          <div><FieldLabel>CAPITAL / MEMBER ($)</FieldLabel><input className="input" type="number" placeholder="10.00" /></div>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
          <div><FieldLabel>TRADING PLATFORM</FieldLabel><input className="input" placeholder="MT5, MT4, cTrader..." /></div>
          <div><FieldLabel>MGMT FEE (%)</FieldLabel><input className="input" type="number" placeholder="5" /></div>
        </div>
        <div><FieldLabel>DESCRIPTION</FieldLabel><textarea className="input" rows={3} placeholder="Optional description..." style={{resize:'vertical'}} /></div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Create Batch</button>
        </div>
      </div>
    </Modal>
  )
}

function NewMemberModal({onClose}:{onClose:()=>void}) {
  return (
    <Modal title="Add New Member" onClose={onClose}>
      <div style={{display:'flex',flexDirection:'column',gap:16}}>
        <div><FieldLabel>FULL NAME</FieldLabel><input className="input" placeholder="Jane Doe" /></div>
        <div><FieldLabel>EMAIL</FieldLabel><input className="input" type="email" placeholder="jane@example.com" /></div>
        <div><FieldLabel>PHONE</FieldLabel><input className="input" placeholder="+1 234 567 8900" /></div>
        <div><FieldLabel>INITIAL PASSWORD</FieldLabel><input className="input" type="password" placeholder="Set temporary password" /></div>
        <div style={{display:'flex',gap:10,justifyContent:'flex-end',marginTop:8}}>
          <button className="btn btn-outline" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary">Add Member</button>
        </div>
      </div>
    </Modal>
  )
}
