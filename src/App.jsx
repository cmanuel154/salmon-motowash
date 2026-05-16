import { useState, useCallback, useEffect, useRef, Fragment } from 'react'
import { getAll, setItem, updateItem, deleteItem, listenTo } from './db'
import logo from './assets/logo.png'
import logoBlack from './assets/logo - black.png'

const C = {
  bg:'#0a0a0a', surface:'#141414', card:'#1a1a1a', red:'#E8372A',
  blue:'#3B9FD4', white:'#FFFFFF', muted:'#6b7280', border:'#2a2a2a',
  green:'#22c55e', amber:'#f59e0b',
}

const PAYMENT_LABELS = { cash:'Cash', qris:'QRIS', transfer:'Transfer', voucher:'Voucher Gratis' }
const ADDITIONALS_LIST = [{ key:'wax', label:'Wax', price:5000 }]
const INITIAL_MOTOR_TYPES = [
  { id:'MT001', name:'Matic',        price:23000, active:true },
  { id:'MT002', name:'Sport',        price:25000, active:true },
  { id:'MT003', name:'Bebek',        price:23000, active:true },
  { id:'MT004', name:'Besar (>250cc)', price:30000, active:true },
]
const ALL_TABS = [
  { key:'dashboard',  label:'Dashboard'  },
  { key:'kasir',      label:'Kasir'      },
  { key:'member',     label:'Member'     },
  { key:'riwayat',    label:'Riwayat'    },
  { key:'finance',    label:'Finance'    },
  { key:'pengaturan', label:'Pengaturan' },
]
const PERM_META = [
  { key:'dashboard',   label:'Dashboard',   bg:'#0a1828', color:C.blue    },
  { key:'kasir',       label:'Kasir',       bg:'#1a0a0a', color:C.red     },
  { key:'member',      label:'Member',      bg:'#0a1a0a', color:C.green   },
  { key:'riwayat',     label:'Riwayat',     bg:'#1a1a0a', color:C.amber   },
  { key:'riwayat_edit',label:'Riwayat✎',   bg:'#1a1400', color:'#fb923c' },
  { key:'finance',     label:'Finance',     bg:'#031a20', color:'#06b6d4' },
  { key:'pengaturan',  label:'Pengaturan',  bg:'#1a0a1a', color:'#c084fc' },
]

const normalizePlate = (s) => s.trim().toUpperCase().replace(/\s+/g, '')
const formatRp       = (n) => 'Rp ' + n.toLocaleString('id-ID')
const todayStr       = ()  => new Date().toISOString().slice(0, 10)
const timeStr        = ()  => new Date().toLocaleTimeString('id-ID', { hour:'2-digit', minute:'2-digit' })
const fmtDate        = (s) => new Date(s + 'T00:00:00').toLocaleDateString('id-ID', { day:'2-digit', month:'short', year:'numeric' })
const nextMemberId   = (l) => 'M'   + String(l.reduce((m,x) => Math.max(m, parseInt(x.id.slice(1))  || 0), 0) + 1).padStart(3,'0')
const nextTrxId      = (l) => 'TRX' + String(l.reduce((m,x) => Math.max(m, parseInt(x.id.slice(3))  || 0), 0) + 1).padStart(3,'0')
const nextCashId     = (l) => 'CSH' + String(l.reduce((m,x) => Math.max(m, parseInt(x.id.slice(3))  || 0), 0) + 1).padStart(3,'0')
const nextMotorId    = (l) => 'MT'  + String(l.reduce((m,x) => Math.max(m, parseInt(x.id.slice(2))  || 0), 0) + 1).padStart(3,'0')
const nextWorkerId   = (l) => 'WRK' + String(l.reduce((m,x) => Math.max(m, parseInt(x.id.slice(3))  || 0), 0) + 1).padStart(3,'0')
const nextLogId      = (l) => 'LOG' + String(l.reduce((m,x) => Math.max(m, parseInt(x.id?.slice(3)) || 0), 0) + 1).padStart(3,'0')

const INITIAL_USERS = [
  { id:'u1', username:'owner',  password:'owner123', name:'Owner',   permissions:['dashboard','kasir','member','riwayat','riwayat_edit','finance','pengaturan'] },
  { id:'u2', username:'kasir1', password:'kasir123', name:'Kasir 1', permissions:['kasir'] },
]
const INITIAL_MEMBERS = [
  { id:'M001', plate:'B1234ABC', name:'Andi Pratama',  phone:'081234567890', joinDate:'2025-01-15', washCount:8,  vouchers:1, totalSpent:161000 },
  { id:'M002', plate:'D5678XYZ', name:'Budi Santoso',  phone:'082345678901', joinDate:'2025-02-20', washCount:3,  vouchers:0, totalSpent:69000  },
  { id:'M003', plate:'F9012MNO', name:'Citra Dewi',    phone:'083456789012', joinDate:'2025-03-10', washCount:15, vouchers:0, totalSpent:322000 },
  { id:'M004', plate:'B4567DEF', name:'Dimas Raharjo', phone:'084567890123', joinDate:'2025-04-01', washCount:5,  vouchers:1, totalSpent:115000 },
]
const T = (o) => ({ serviceType:'touchless', additionals:[], ...o })
const INITIAL_TRANSACTIONS = [
  T({ id:'TRX001', memberId:'M001', plate:'B1234ABC', memberName:'Andi Pratama',  date:'2025-04-01', time:'09:00', payment:'cash',     subtotal:23000, totalAmount:23000, amount:23000, isVoucherRedemption:false, earnedVoucher:false, kasir:'Kasir 1' }),
  T({ id:'TRX002', memberId:'M002', plate:'D5678XYZ', memberName:'Budi Santoso',  date:'2025-04-05', time:'10:30', payment:'qris',     subtotal:23000, totalAmount:23000, amount:23000, isVoucherRedemption:false, earnedVoucher:false, kasir:'Kasir 1' }),
  T({ id:'TRX003', memberId:'M003', plate:'F9012MNO', memberName:'Citra Dewi',    date:'2025-04-08', time:'14:00', payment:'transfer', subtotal:25000, totalAmount:25000, amount:25000, isVoucherRedemption:false, earnedVoucher:false, kasir:'Kasir 1', serviceType:'manual', additionals:['wax'] }),
  T({ id:'TRX004', memberId:'M001', plate:'B1234ABC', memberName:'Andi Pratama',  date:'2025-04-10', time:'11:15', payment:'voucher',  subtotal:23000, totalAmount:0,     amount:0,     isVoucherRedemption:true,  earnedVoucher:false, kasir:'Kasir 1' }),
  T({ id:'TRX005', memberId:'M004', plate:'B4567DEF', memberName:'Dimas Raharjo', date:'2025-04-15', time:'08:45', payment:'cash',     subtotal:23000, totalAmount:23000, amount:23000, isVoucherRedemption:false, earnedVoucher:true,  kasir:'Kasir 1' }),
  T({ id:'TRX006', memberId:'M003', plate:'F9012MNO', memberName:'Citra Dewi',    date:'2025-05-01', time:'16:30', payment:'cash',     subtotal:28000, totalAmount:28000, amount:28000, isVoucherRedemption:false, earnedVoucher:false, kasir:'Owner',   additionals:['wax'] }),
]

/* ── Shared styles ── */
const inputBase = {
  padding:'11px 14px', background:C.card, border:`1px solid ${C.border}`,
  borderRadius:8, color:C.white, fontFamily:'Barlow, sans-serif',
  fontSize:14, outline:'none', width:'100%', boxSizing:'border-box',
}
const btnRed   = { background:C.red, border:'none', color:'#fff', cursor:'pointer', padding:'12px 0', borderRadius:8, width:'100%', fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:16, letterSpacing:1 }
const btnGhost = { background:'none', border:`1px solid ${C.border}`, color:C.muted, cursor:'pointer', padding:'11px 0', borderRadius:8, width:'100%', fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:14 }
const lbl      = (text) => <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:600, color:C.muted, marginBottom:6 }}>{text}</div>

/* ── Toast ── */
function Toast({ toasts }) {
  return (
    <div style={{ position:'fixed', top:20, right:20, zIndex:9999, display:'flex', flexDirection:'column', gap:8, pointerEvents:'none' }}>
      {toasts.map(t => (
        <div key={t.id} style={{ padding:'12px 20px', borderRadius:8, background:t.type==='success'?C.green:t.type==='error'?C.red:C.amber, color:'#fff', fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:14, boxShadow:'0 4px 16px rgba(0,0,0,0.5)', minWidth:260, animation:'slideIn 0.2s ease' }}>{t.message}</div>
      ))}
    </div>
  )
}
function useToasts() {
  const [toasts, setToasts] = useState([])
  const addToast = useCallback((message, type='success') => {
    const id = Date.now() + Math.random()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), 3000)
  }, [])
  return { toasts, addToast }
}
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768)
  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth <= 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])
  return isMobile
}

/* ── LoyaltyBar ── */
function LoyaltyBar({ washCount, big }) {
  const progress = washCount % 5
  const sz = big ? 30 : 18
  return (
    <div style={{ display:'flex', gap:big?10:6, alignItems:'center' }}>
      {[0,1,2,3,4].map(i => (
        <div key={i} style={{ width:sz, height:sz, borderRadius:'50%', background:i<progress?C.blue:'transparent', border:`2px solid ${i<progress?C.blue:C.muted}`, transition:'background 0.3s', flexShrink:0 }} />
      ))}
      {big && <span style={{ color:C.muted, fontSize:13, fontFamily:'Barlow, sans-serif', marginLeft:6 }}>{progress}/5 menuju voucher gratis</span>}
    </div>
  )
}


/* ── Nav ── */
function Nav({ user, page, setPage, logout }) {
  const isMobile = useIsMobile()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const tabs = ALL_TABS.filter(t => user.permissions.includes(t.key))
  const navTo = (key) => { setPage(key); setDrawerOpen(false) }

  if (isMobile) return (
    <>
      <nav style={{ position:'sticky', top:0, zIndex:200, background:C.surface, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 16px', height:52 }}>
        <img src={logo} alt="Salmon Moto Wash" style={{ height:28, display:'block', objectFit:'contain' }} />
        <button onClick={()=>setDrawerOpen(o=>!o)} style={{ background:'none', border:'none', cursor:'pointer', padding:10, color:C.white, minWidth:44, minHeight:44, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>
      </nav>
      {drawerOpen && (
        <div onClick={()=>setDrawerOpen(false)} style={{ position:'fixed', inset:0, zIndex:300 }}>
          <div onClick={e=>e.stopPropagation()} style={{ background:C.surface, borderBottom:`1px solid ${C.border}`, width:'100%', boxShadow:'0 8px 32px rgba(0,0,0,0.6)' }}>
            {tabs.map(t => (
              <button key={t.key} onClick={()=>navTo(t.key)} style={{ display:'block', width:'100%', background:page===t.key?C.card:'none', border:'none', borderBottom:`1px solid ${C.border}`, padding:'0 20px', height:48, textAlign:'left', fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:15, color:page===t.key?C.white:C.muted, cursor:'pointer' }}>{t.label}</button>
            ))}
            <div style={{ padding:'12px 20px', borderBottom:`1px solid ${C.border}` }}>
              <div style={{ fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:13, color:C.white }}>{user.name}</div>
              <div style={{ fontFamily:'Barlow, sans-serif', fontSize:11, color:C.muted }}>{user.permissions.includes('pengaturan')?'Administrator':'Pengguna'}</div>
            </div>
            <button onClick={logout} style={{ display:'block', width:'100%', background:'none', border:'none', padding:'14px 20px', textAlign:'left', fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:14, color:C.red, cursor:'pointer', minHeight:44 }}>Keluar</button>
          </div>
        </div>
      )}
    </>
  )

  return (
    <nav style={{ position:'sticky', top:0, zIndex:100, background:C.surface, borderBottom:`1px solid ${C.border}`, display:'flex', alignItems:'center', padding:'0 24px', height:60, gap:16 }}>
      <div style={{ marginRight:16, flexShrink:0 }}>
        <img src={logo} alt="Salmon Moto Wash" style={{ height:36, display:'block', objectFit:'contain' }} />
      </div>
      <div style={{ display:'flex', gap:2, flex:1 }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => setPage(t.key)} style={{ background:page===t.key?C.card:'none', border:'none', cursor:'pointer', padding:'7px 16px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:14, color:page===t.key?C.white:C.muted, transition:'all 0.15s' }}>{t.label}</button>
        ))}
      </div>
      <div style={{ display:'flex', alignItems:'center', gap:14, flexShrink:0 }}>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:13, color:C.white }}>{user.name}</div>
          <div style={{ fontFamily:'Barlow, sans-serif', fontSize:11, color:C.muted }}>{user.permissions.includes('pengaturan')?'Administrator':'Pengguna'}</div>
        </div>
        <button onClick={logout} style={{ background:'none', border:`1px solid ${C.border}`, color:C.muted, cursor:'pointer', padding:'6px 14px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:13, fontWeight:500 }}>Keluar</button>
      </div>
    </nav>
  )
}

/* ── Login ── */
function LoginPage({ onLogin }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error,    setError]    = useState('')
  const submit = (e) => { e.preventDefault(); if (!onLogin(username, password)) setError('Username atau password salah') }
  return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:'48px 40px', width:360 }}>
        <div style={{ textAlign:'center', marginBottom:36 }}>
          <img src={logo} alt="" style={{ width:180, display:'block', margin:'0 auto 16px', objectFit:'contain' }} />
          <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:13, color:C.red, letterSpacing:2 }}>SALMON MOTO WASH SYSTEM</div>
        </div>
        <form onSubmit={submit} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <div>{lbl('Username')}<input value={username} onChange={e=>setUsername(e.target.value)} placeholder="Masukkan username" style={inputBase} autoComplete="username" /></div>
          <div>{lbl('Password')}<input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Masukkan password" style={inputBase} autoComplete="current-password" /></div>
          {error && <div style={{ color:C.red, fontFamily:'Barlow, sans-serif', fontSize:13, textAlign:'center' }}>{error}</div>}
          <button type="submit" style={{ ...btnRed, marginTop:6 }}>MASUK</button>
        </form>
      </div>
    </div>
  )
}

/* ── Receipt ── */
function generateReceiptHtml(trx, member, logoAbsUrl) {
  const svcMeta  = trx.motorType
    ? { label:trx.motorType.name, price:trx.motorType.price }
    : { label: trx.serviceType==='touchless'?'Touchless':trx.serviceType==='manual'?'Manual':'Cuci', price: trx.serviceType==='touchless'?23000:trx.serviceType==='manual'?20000:0 }
  const progress = member.washCount % 5
  const bar      = [0,1,2,3,4].map(i => i < progress ? '&#9632;' : '&#9633;').join(' ')
  const fmtR     = (n) => 'Rp ' + n.toLocaleString('id-ID')
  const fmtDt    = (d) => { const x = new Date(d+'T00:00:00'); return `${String(x.getDate()).padStart(2,'0')}/${String(x.getMonth()+1).padStart(2,'0')}/${x.getFullYear()}` }
  const lineItems = trx.isVoucherRedemption
    ? `<tr><td>${svcMeta.label}</td><td>GRATIS (Voucher)</td></tr>`
    : [`<tr><td>Layanan: ${svcMeta.label}</td><td>${fmtR(svcMeta.price)}</td></tr>`,
       ...(trx.additionals||[]).map(k=>{ const a=ADDITIONALS_LIST.find(x=>x.key===k); return a?`<tr><td>+ ${a.label}</td><td>${fmtR(a.price)}</td></tr>`:'' })
      ].join('')
  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Resi ${trx.id}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:'Courier New',Courier,monospace;width:320px;margin:0 auto;background:#fff;color:#000;font-size:13px;line-height:1.7;padding:12px}
  .c{text-align:center}.b{font-weight:bold}
  .dd{border-top:1px dashed #000;margin:8px 0}.ss{border-top:2px solid #000;margin:8px 0}
  table{width:100%;border-collapse:collapse}td{padding:1px 0;vertical-align:top}
  td:last-child{text-align:right;white-space:nowrap}
  .tot td{font-weight:bold;font-size:15px;padding-top:5px;border-top:1px dashed #000}
  .bar{font-size:16px;letter-spacing:4px}
  .dt{display:flex;justify-content:space-between;margin-top:6px}
  @page{margin:0;size:80mm auto}
  @media print{body{margin:10mm}}
</style></head><body>
<div class="c">
  <img src="${logoAbsUrl}" width="120" alt="" style="display:block;margin:0 auto 8px">
  <div class="b" style="font-size:15px;letter-spacing:1px">SALMON MOTO WASH</div>
  <div>Less for More</div>
  <div style="font-size:11px">Jl. [Alamat], Sukatani Depok</div>
</div>
<div class="dt"><span>${fmtDt(trx.date)}</span><span>${trx.time}</span></div>
<div class="ss"></div>
<table>
  <tr><td>No. Resi</td><td>${trx.id}</td></tr>
  <tr><td>No. Antrian</td><td style="font-size:18px;font-weight:bold;color:#E8372A">Q-${String(trx.queueNumber||0).padStart(2,'0')}</td></tr>
  <tr><td>Kasir</td><td>${trx.kasir}</td></tr>
</table>
<div class="ss"></div>
<table>
  <tr><td>Plat</td><td>${member.plate}</td></tr>
  <tr><td>Nama</td><td>${member.name}</td></tr>
</table>
<div class="ss"></div>
<table>${lineItems}<tr class="tot"><td>TOTAL</td><td>${trx.isVoucherRedemption?'GRATIS':fmtR(trx.totalAmount)}</td></tr></table>
<div style="margin-top:6px">Pembayaran: <b>${PAYMENT_LABELS[trx.payment]}</b></div>
<div class="ss"></div>
<div class="c">
  <div class="bar">${bar}</div>
  <div>Progress Loyalty: ${progress}/5</div>
  <div style="font-size:11px;margin-top:2px">Kumpulkan 5 cuci untuk cuci GRATIS!</div>
</div>
<div class="dd"></div>
<div class="c" style="font-size:11px">
  <div>Terima kasih atas kunjungan Anda!</div>
  <div>Simpan resi ini sebagai bukti loyalty</div>
</div>
<script>window.onload=function(){window.print()}</script>
</body></html>`
}
function printReceipt(trx, member) {
  const logoAbsUrl = new URL(logoBlack, window.location.href).href
  const win = window.open('', '_blank')
  if (!win) return
  win.document.write(generateReceiptHtml(trx, member, logoAbsUrl))
  win.document.close()
  win.focus()
}

/* ── RatingModal ── */
function RatingModal({ trx, onComplete, onClose }) {
  const isMobile = useIsMobile()
  const [rating, setRating] = useState(null)
  const LABELS = { 1:'Kurang', 2:'Cukup', 3:'Baik', 4:'Sangat Baik', 5:'Luar Biasa!' }
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:isMobile?'flex-end':'center', justifyContent:'center', padding:isMobile?0:24 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:isMobile?'16px 16px 0 0':16, padding:isMobile?'28px 24px 36px':36, width:isMobile?'100%':380, textAlign:'center' }}>
        <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:22, color:C.white, marginBottom:6 }}>Konfirmasi Selesai</div>
        <div style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted, marginBottom:24 }}>{trx.workerName||'—'} — {trx.plate}</div>
        <div style={{ display:'flex', justifyContent:'center', gap:4, marginBottom:10 }}>
          {[1,2,3,4,5].map(s => (
            <button key={s} onClick={()=>setRating(r=>r===s?null:s)} style={{ background:'none', border:'none', cursor:'pointer', padding:'0 6px', fontSize:40, color:s<=(rating||0)?'#f59e0b':C.border, transition:'color 0.1s', lineHeight:1 }}>★</button>
          ))}
        </div>
        <div style={{ fontFamily:'Barlow, sans-serif', fontSize:14, color:rating?'#f59e0b':C.muted, marginBottom:24, minHeight:22 }}>
          {rating ? LABELS[rating] : 'Pilih bintang (opsional)'}
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button onClick={()=>onComplete(null)} style={btnGhost}>Lewati</button>
          <button onClick={()=>onComplete(rating)} style={btnRed}>Konfirmasi</button>
        </div>
      </div>
    </div>
  )
}

/* ── KasirPage ── */
function KasirPage({ members, transactions, addTransaction, updateMember, addMember, addCashLog, motorTypes, workers, completeTransaction, user, addToast }) {
  const isMobile = useIsMobile()
  const [step,        setStep]        = useState('input')
  const [plate,       setPlate]       = useState('')
  const [suggestions, setSuggestions] = useState([])
  const [foundMember, setFoundMember] = useState(null)
  const [regName,     setRegName]     = useState('')
  const [regPhone,    setRegPhone]    = useState('')
  const [selectedMotor,  setSelectedMotor]  = useState(null)
  const [selectedWorker, setSelectedWorker] = useState(null)
  const [notes,          setNotes]          = useState('')
  const [ratingTarget,   setRatingTarget]   = useState(null)
  const [additionals, setAdditionals] = useState([])
  const [payment,     setPayment]     = useState('cash')
  const [lastTrx,     setLastTrx]     = useState(null)
  const [lastMember,  setLastMember]  = useState(null)

  const reset = () => {
    setStep('input'); setPlate(''); setSuggestions([]); setFoundMember(null)
    setRegName(''); setRegPhone(''); setSelectedMotor(null); setSelectedWorker(null)
    setNotes(''); setAdditionals([]); setPayment('cash'); setLastTrx(null); setLastMember(null)
  }

  const onPlateChange = (val) => {
    setPlate(val)
    const q = normalizePlate(val)
    if (!q) { setSuggestions([]); return }
    setSuggestions(members.filter(m => normalizePlate(m.plate).includes(q)).slice(0, 5))
  }

  const selectSuggestion = (m) => { setPlate(m.plate); setSuggestions([]); setFoundMember(m); setStep('payment') }

  const handleSearch = () => {
    setSuggestions([])
    const q = normalizePlate(plate)
    if (!q) { addToast('Masukkan plat nomor', 'error'); return }
    const found = members.find(m => normalizePlate(m.plate) === q)
    if (found) { setFoundMember(found); setStep('payment') }
    else       { setStep('register') }
  }

  const handleRegister = () => {
    if (!regName.trim())  { addToast('Masukkan nama lengkap', 'error');  return }
    if (!regPhone.trim()) { addToast('Masukkan nomor telepon', 'error'); return }
    const np = normalizePlate(plate)
    const newMember = { id:nextMemberId(members), plate:np, name:regName.trim(), phone:regPhone.trim(), joinDate:todayStr(), washCount:0, vouchers:0, totalSpent:0 }
    addMember(newMember); setFoundMember(newMember); setPayment('cash'); setStep('payment')
    addToast(`Member baru ${newMember.name} berhasil didaftarkan!`, 'success')
  }

  const toggleAdditional = (key) => setAdditionals(prev => prev.includes(key) ? prev.filter(k=>k!==key) : [...prev, key])

  const calcSubtotal = () => {
    const svcPrice = selectedMotor?.price || 0
    return svcPrice + additionals.reduce((sum,k) => sum + (ADDITIONALS_LIST.find(a=>a.key===k)?.price||0), 0)
  }

  const handleConfirm = () => {
    if (!selectedWorker)                             { addToast('Pilih pekerja','error');             return }
    if (!selectedMotor)                              { addToast('Pilih jenis motor','error');         return }
    if (payment==='voucher' && foundMember.vouchers<1) { addToast('Voucher tidak tersedia','error'); return }
    const subtotal    = calcSubtotal()
    const totalAmount = payment==='voucher' ? 0 : subtotal
    const newWashCount  = foundMember.washCount + 1
    const earnedVoucher = newWashCount % 5 === 0
    const newVouchers   = Math.max(0, foundMember.vouchers + (earnedVoucher?1:0) - (payment==='voucher'?1:0))
    const trx = {
      id:nextTrxId(transactions), memberId:foundMember.id, plate:foundMember.plate, memberName:foundMember.name,
      date:todayStr(), time:timeStr(), payment, amount:totalAmount,
      motorType:{ id:selectedMotor.id, name:selectedMotor.name, price:selectedMotor.price },
      workerId:selectedWorker.id, workerName:selectedWorker.name,
      notes:notes.trim()||null,
      additionals:[...additionals], subtotal, totalAmount,
      isVoucherRedemption:payment==='voucher', earnedVoucher, kasir:user.name,
    }
    const updatedMember = { ...foundMember, washCount:newWashCount, vouchers:newVouchers, totalSpent:foundMember.totalSpent+totalAmount }
    addTransaction(trx); updateMember(updatedMember)
    if (payment !== 'voucher') {
      addCashLog({ type:'in', amount:trx.totalAmount, description:`Cuci ${trx.motorType.name} - ${trx.plate}`, category:'sales_revenue', date:trx.date, time:trx.time, source:'kasir', refTrxId:trx.id, createdBy:trx.kasir, editable:false })
    }
    setLastTrx(trx); setLastMember(updatedMember)
    printReceipt(trx, updatedMember)
    setStep('receipt')
    if (earnedVoucher) addToast(`Selamat! ${foundMember.name} dapat 1 voucher gratis!`, 'success')
  }

  const card = { background:C.surface, border:`1px solid ${C.border}`, borderRadius:16, padding:isMobile?20:32, maxWidth:520, margin:'0 auto' }
  const STEP_KEYS   = ['input','register','payment','receipt']
  const STEP_LABELS = isMobile ? ['Plat','Member','Bayar','Struk'] : ['Plat Nomor','Data Member','Pembayaran','Struk']
  const curIdx = STEP_KEYS.indexOf(step)

  return (
    <div style={{ padding:isMobile?'16px':'40px 24px', minHeight:'100vh', background:C.bg }}>
      {ratingTarget && <RatingModal trx={ratingTarget} onComplete={(r)=>{ completeTransaction(ratingTarget.id,r); setRatingTarget(null) }} onClose={()=>setRatingTarget(null)} />}
      <div style={{ maxWidth:520, margin:'0 auto' }}>
        <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:isMobile?22:28, color:C.white, marginBottom:isMobile?14:24, letterSpacing:1 }}>KASIR — CUCI MOTOR</div>

        {/* Worker Distribution */}
        {(() => {
          const today2 = todayStr()
          const activeWorkers = (workers||[]).filter(w=>w.active)
          const todayTrx2 = transactions.filter(t=>t.date===today2)
          const counts = activeWorkers.map(w => {
            const wTrx = todayTrx2.filter(t=>t.workerId===w.id)
            const n = wTrx.length
            const done = wTrx.filter(t=>t.status==='selesai'&&t.completedAt&&t.createdAt)
            const avgDuration = done.length>0 ? Math.round(done.reduce((s,t)=>s+(new Date(t.completedAt)-new Date(t.createdAt))/60000,0)/done.length) : null
            const rated = wTrx.filter(t=>t.rating!=null)
            const avgRating = rated.length>0 ? (rated.reduce((s,t)=>s+t.rating,0)/rated.length).toFixed(1) : null
            return { w, n, avgDuration, avgRating }
          })
          const maxN = Math.max(...counts.map(x=>x.n), 0)
          const [dy,dm,dd] = today2.split('-')
          return (
            <div style={{ marginBottom:isMobile?16:24 }}>
              <div style={{ display:'flex', alignItems:'baseline', gap:10, marginBottom:4 }}>
                <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:isMobile?15:17, color:C.white, letterSpacing:0.5 }}>DISTRIBUSI PEKERJA HARI INI</div>
                <span style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'1px 10px', fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:600, color:C.muted }}>{dd}/{dm}/{dy}</span>
              </div>
              <div style={{ fontFamily:'Barlow, sans-serif', fontSize:11, color:C.muted, marginBottom:10 }}>Assign pekerja secara merata berdasarkan jumlah motor hari ini</div>
              {activeWorkers.length===0 ? (
                <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'12px 16px', color:C.muted, fontFamily:'Barlow, sans-serif', fontSize:13 }}>Tambahkan pekerja di Pengaturan</div>
              ) : (
                <div style={{ display:'flex', gap:10, overflowX:'auto', paddingBottom:4 }}>
                  {counts.map(({w,n,avgDuration,avgRating}) => {
                    const isLeader = n===maxN && n>0
                    return (
                      <div key={w.id} style={{ flexShrink:0, width:isMobile?88:100, background:C.surface, border:`1px solid ${isLeader?C.amber:C.border}`, borderRadius:10, padding:'12px 10px', display:'flex', flexDirection:'column', alignItems:'center', gap:5, boxShadow:isLeader?`0 0 8px rgba(245,158,11,0.2)`:undefined }}>
                        <WorkerAvatar worker={w} size={40} />
                        <div style={{ fontFamily:'Barlow, sans-serif', fontWeight:700, fontSize:12, color:C.white, textAlign:'center', lineHeight:1.3, maxWidth:84, overflowWrap:'break-word' }}>{w.name}</div>
                        {n>0
                          ? <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:900, fontSize:18, color:C.red }}>{n} motor</div>
                          : <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted }}>Belum ada</div>
                        }
                        <div style={{ fontFamily:'Barlow, sans-serif', fontSize:11, color:C.muted }}>
                          {avgDuration!=null ? `~${avgDuration} mnt` : '—'}
                        </div>
                        {avgRating!=null && <div style={{ fontFamily:'Barlow, sans-serif', fontSize:11, color:'#f59e0b' }}>★ {avgRating}</div>}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })()}

        {/* Daily summary */}
        {(() => {
          const today = todayStr()
          const [y,m,d] = today.split('-')
          const todayTrx      = transactions.filter(t => t.date === today)
          const cashTotal     = todayTrx.filter(t=>t.payment==='cash').reduce((s,t)=>s+(t.totalAmount||t.amount),0)
          const qrisTotal     = todayTrx.filter(t=>t.payment==='qris').reduce((s,t)=>s+(t.totalAmount||t.amount),0)
          const transferTotal = todayTrx.filter(t=>t.payment==='transfer').reduce((s,t)=>s+(t.totalAmount||t.amount),0)
          const voucherCount  = todayTrx.filter(t=>t.isVoucherRedemption).length
          const grandTotal    = cashTotal + qrisTotal + transferTotal
          const cards = [
            { emoji:'💵', label:'Cash',     value:formatRp(cashTotal),         color:C.green },
            { emoji:'📱', label:'QRIS',     value:formatRp(qrisTotal),         color:C.blue  },
            { emoji:'🏦', label:'Transfer', value:formatRp(transferTotal),     color:C.amber },
            { emoji:'🎟️', label:'Voucher',  value:`${voucherCount} transaksi`, color:C.red   },
          ]
          return (
            <div style={{ marginBottom:28 }}>
              <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:13, color:C.muted, letterSpacing:1, marginBottom:10 }}>
                RINGKASAN HARI INI — {d}/{m}/{y}
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:8 }}>
                {cards.map(c => (
                  <div key={c.label} style={{ background:C.card, borderRadius:10, padding:'12px 16px', border:`1px solid ${C.border}` }}>
                    <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, marginBottom:4 }}>{c.emoji} {c.label}</div>
                    <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:20, color:c.color }}>{c.value}</div>
                  </div>
                ))}
              </div>
              <div style={{ background:C.card, borderRadius:10, padding:'12px 18px', border:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, fontWeight:600, letterSpacing:0.5 }}>TOTAL PEMASUKAN HARI INI</div>
                <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:900, fontSize:22, color:C.white }}>{formatRp(grandTotal)}</div>
              </div>
            </div>
          )
        })()}

        {/* Step indicator */}
        <div style={{ display:'flex', alignItems:'center', marginBottom:28 }}>
          {STEP_LABELS.map((s,i) => {
            const active = i <= curIdx
            return (
              <div key={s} style={{ display:'flex', alignItems:'center', flex:1 }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                  <div style={{ width:24, height:24, borderRadius:'50%', flexShrink:0, background:active?C.blue:C.card, border:`2px solid ${active?C.blue:C.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Barlow, sans-serif', fontWeight:700, fontSize:11, color:active?'#fff':C.muted }}>{i+1}</div>
                  <span style={{ fontFamily:'Barlow, sans-serif', fontSize:isMobile?10:12, color:active?C.white:C.muted, whiteSpace:'nowrap' }}>{s}</span>
                </div>
                {i<3 && <div style={{ flex:1, height:1, background:i<curIdx?C.blue:C.border, margin:'0 6px' }} />}
              </div>
            )
          })}
        </div>

        {/* Step: input */}
        {step==='input' && (
          <div style={card}>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:20, color:C.white, marginBottom:20 }}>Input Plat Nomor</div>
            <div style={{ position:'relative' }}>
              <div style={{ display:'flex', gap:10 }}>
                <input value={plate} onChange={e=>onPlateChange(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')handleSearch();if(e.key==='Escape')setSuggestions([])}} placeholder="Contoh: B1234ABC" style={{ ...inputBase, textTransform:'uppercase', flex:1 }} autoFocus autoComplete="off" />
                <button onClick={handleSearch} style={{ ...btnRed, width:'auto', padding:'11px 22px' }}>Cari</button>
              </div>
              {suggestions.length>0 && (
                <div style={{ position:'absolute', top:'100%', left:0, right:68, background:C.card, border:`1px solid ${C.border}`, borderRadius:8, zIndex:20, marginTop:4, boxShadow:'0 8px 24px rgba(0,0,0,0.5)', overflow:'hidden' }}>
                  {suggestions.map(m => (
                    <div key={m.id} onClick={()=>selectSuggestion(m)} style={{ padding:'10px 14px', cursor:'pointer', borderBottom:`1px solid ${C.border}`, display:'flex', justifyContent:'space-between', alignItems:'center' }} onMouseEnter={e=>e.currentTarget.style.background=C.surface} onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
                      <span style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:16, color:C.white }}>{m.plate}</span>
                      <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{m.name}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step: register */}
        {step==='register' && (
          <div style={card}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:16 }}>
              <div style={{ width:8, height:8, borderRadius:'50%', background:C.amber, flexShrink:0 }} />
              <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.amber, fontWeight:600 }}>Plat tidak ditemukan — daftarkan member baru</span>
            </div>
            <div style={{ background:C.card, borderRadius:8, padding:'10px 16px', marginBottom:20, display:'inline-block' }}>
              <span style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:20, color:C.white, letterSpacing:1 }}>{normalizePlate(plate)}</span>
            </div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>{lbl('Nama Lengkap')}<input value={regName} onChange={e=>setRegName(e.target.value)} placeholder="Masukkan nama" style={inputBase} autoFocus /></div>
              <div>{lbl('Nomor Telepon')}<input value={regPhone} onChange={e=>setRegPhone(e.target.value)} placeholder="08xxxxxxxxxx" type="tel" style={inputBase} /></div>
              <div style={{ display:'flex', gap:10, marginTop:4 }}>
                <button onClick={reset} style={btnGhost}>Batal</button>
                <button onClick={handleRegister} style={btnRed}>Daftar & Lanjut</button>
              </div>
            </div>
          </div>
        )}

        {/* Step: payment */}
        {step==='payment' && foundMember && (
          <div style={card}>
            {/* Member info */}
            <div style={{ background:C.card, borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div>
                  <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:22, color:C.white }}>{foundMember.name}</div>
                  <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:600, fontSize:16, color:C.muted, letterSpacing:1 }}>{foundMember.plate}</div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontFamily:'Barlow, sans-serif', fontSize:11, color:C.muted }}>Total Cuci</div>
                  <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:24, color:C.white }}>{foundMember.washCount}x</div>
                </div>
              </div>
              {foundMember.vouchers>0 && (
                <div style={{ marginTop:10, display:'inline-flex', alignItems:'center', gap:6, background:'#0d2e40', borderRadius:6, padding:'4px 12px', border:'1px solid #1a4a6a' }}>
                  <span style={{ color:C.blue, fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:13 }}>🎫 {foundMember.vouchers} Voucher Gratis</span>
                </div>
              )}
            </div>

            {/* Loyalty */}
            <div style={{ marginBottom:20 }}>{lbl('PROGRESS LOYALITAS')}<LoyaltyBar washCount={foundMember.washCount} big /></div>

            {/* Worker selection */}
            <div style={{ marginBottom:20 }}>
              {lbl('PEKERJA')}
              {workers.filter(w=>w.active).length===0 ? (
                <div style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted, padding:'10px 0' }}>Tambahkan pekerja di Pengaturan</div>
              ) : (
                <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
                  {workers.filter(w=>w.active).map(w => {
                    const sel = selectedWorker?.id===w.id
                    return (
                      <button key={w.id} onClick={()=>setSelectedWorker(w)} style={{ flexShrink:0, width:80, padding:'10px 6px', background:sel?'#0a1828':C.card, border:`2px solid ${sel?C.blue:C.border}`, borderRadius:10, cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:6, boxShadow:sel?'0 0 10px rgba(59,159,212,0.3)':'none', transition:'all 0.15s', minHeight:44 }}>
                        <WorkerAvatar worker={w} size={44} />
                        <div style={{ fontFamily:'Barlow, sans-serif', fontSize:11, color:sel?C.white:C.muted, textAlign:'center', lineHeight:1.3, maxWidth:72, overflowWrap:'break-word' }}>{w.name}</div>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Notes */}
            <div style={{ marginBottom:20 }}>
              {lbl('Catatan Motor (opsional)')}
              <textarea value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Contoh: body lecet kiri, ban kempis..." maxLength={200} rows={2}
                style={{ ...inputBase, resize:'vertical', minHeight:60, fontFamily:'Barlow, sans-serif' }} />
            </div>

            {/* Motor type */}
            <div style={{ marginBottom:20 }}>
              {lbl('JENIS MOTOR')}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {motorTypes.filter(mt=>mt.active).map(mt => {
                  const sel = selectedMotor?.id===mt.id
                  return (
                    <button key={mt.id} onClick={()=>setSelectedMotor(mt)} style={{ background:sel?'#0d1e2e':C.card, border:`2px solid ${sel?C.red:C.border}`, borderRadius:8, padding:'14px 0', cursor:'pointer', display:'flex', flexDirection:'column', alignItems:'center', gap:4, transition:'all 0.15s' }}>
                      <span style={{ fontFamily:'Barlow, sans-serif', fontWeight:700, fontSize:14, color:sel?C.white:C.muted }}>{mt.name}</span>
                      <span style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:17, color:sel?C.red:C.muted }}>{formatRp(mt.price)}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Additionals */}
            <div style={{ marginBottom:20 }}>
              {lbl('LAYANAN TAMBAHAN')}
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                {ADDITIONALS_LIST.map(a => {
                  const on = additionals.includes(a.key)
                  return (
                    <label key={a.key} style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', background:on?'#1a1a0a':C.card, border:`2px solid ${on?C.amber:C.border}`, borderRadius:8, padding:'10px 16px', transition:'all 0.15s' }}>
                      <input type="checkbox" checked={on} onChange={()=>toggleAdditional(a.key)} style={{ accentColor:C.amber, width:16, height:16, cursor:'pointer' }} />
                      <div>
                        <div style={{ fontFamily:'Barlow, sans-serif', fontWeight:700, fontSize:14, color:on?C.white:C.muted }}>+ {a.label}</div>
                        <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontSize:13, color:on?C.amber:C.muted }}>{formatRp(a.price)}</div>
                      </div>
                    </label>
                  )
                })}
              </div>
            </div>

            {/* Payment method */}
            <div style={{ marginBottom:20 }}>
              {lbl('METODE PEMBAYARAN')}
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8 }}>
                {['cash','qris','transfer',...(foundMember.vouchers>0?['voucher']:[])].map(pm => {
                  const sel=payment===pm, isV=pm==='voucher'
                  return (
                    <button key={pm} onClick={()=>setPayment(pm)} style={{ background:sel?(isV?'#0d2e40':'#0d1e2e'):C.card, border:`2px solid ${sel?(isV?C.blue:C.red):C.border}`, borderRadius:8, padding:'12px 0', cursor:'pointer', fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:14, color:sel?C.white:C.muted, transition:'all 0.15s' }}>
                      {isV ? '🎫 Voucher' : PAYMENT_LABELS[pm]}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Price breakdown */}
            <div style={{ background:C.card, borderRadius:10, padding:'14px 18px', marginBottom:20 }}>
              {payment==='voucher' ? (
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                  <span style={{ fontFamily:'Barlow, sans-serif', fontSize:14, color:C.muted }}>Total Bayar</span>
                  <span style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:900, fontSize:26, color:C.blue }}>GRATIS</span>
                </div>
              ) : (
                <>
                  {selectedMotor && (
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{selectedMotor.name}</span>
                      <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white }}>{formatRp(selectedMotor.price)}</span>
                    </div>
                  )}
                  {additionals.map(k => { const a=ADDITIONALS_LIST.find(x=>x.key===k); return a?(
                    <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>+ {a.label}</span>
                      <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.amber }}>{formatRp(a.price)}</span>
                    </div>
                  ):null})}
                  <div style={{ borderTop:`1px solid ${C.border}`, marginTop:8, paddingTop:8, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                    <span style={{ fontFamily:'Barlow, sans-serif', fontSize:14, color:C.muted, fontWeight:600 }}>Total Bayar</span>
                    <span style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:900, fontSize:24, color:C.white }}>{formatRp(calcSubtotal())}</span>
                  </div>
                </>
              )}
            </div>

            <div style={{ display:'flex', gap:10 }}>
              <button onClick={reset} style={btnGhost}>Batal</button>
              <button onClick={handleConfirm} style={btnRed}>Konfirmasi & Print</button>
            </div>
          </div>
        )}

        {/* Step: receipt */}
        {step==='receipt' && lastTrx && lastMember && (
          <div style={{ ...card, maxWidth:440 }}>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:900, fontSize:22, color:C.red, letterSpacing:1 }}>SALMON MOTO WASH</div>
              <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, letterSpacing:2 }}>BUKTI TRANSAKSI</div>
              <div style={{ borderTop:`1px dashed ${C.border}`, marginTop:16 }} />
            </div>
            {[['ID Transaksi',lastTrx.id],['Tanggal',fmtDate(lastTrx.date)],['Waktu',lastTrx.time],['Kasir',lastTrx.kasir]].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{k}</span>
                <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white, fontWeight:600 }}>{v}</span>
              </div>
            ))}
            <div style={{ borderTop:`1px dashed ${C.border}`, margin:'14px 0' }} />
            {[['Nama',lastMember.name],['Plat',lastMember.plate],['Jenis Motor',lastTrx.motorType?.name||'-'],['Metode Bayar',PAYMENT_LABELS[lastTrx.payment]]].map(([k,v]) => (
              <div key={k} style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{k}</span>
                <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white, fontWeight:600 }}>{v}</span>
              </div>
            ))}
            {(lastTrx.additionals||[]).length>0 && (
              <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>Tambahan</span>
                <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.amber, fontWeight:600 }}>{lastTrx.additionals.map(k=>ADDITIONALS_LIST.find(a=>a.key===k)?.label).filter(Boolean).join(', ')}</span>
              </div>
            )}
            <div style={{ background:C.card, borderRadius:8, padding:'12px 16px', margin:'14px 0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
              <span style={{ fontFamily:'Barlow, sans-serif', fontSize:14, color:C.muted }}>Total</span>
              <span style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:900, fontSize:24, color:lastTrx.isVoucherRedemption?C.blue:C.white }}>{lastTrx.isVoucherRedemption?'GRATIS':formatRp(lastTrx.totalAmount)}</span>
            </div>
            <div style={{ borderTop:`1px dashed ${C.border}`, margin:'14px 0' }} />
            <div style={{ marginBottom:16 }}>{lbl(`PROGRESS LOYALITAS (${lastMember.washCount} cuci total)`)}<LoyaltyBar washCount={lastMember.washCount} big /></div>
            {lastTrx.earnedVoucher && (
              <div style={{ background:'#0a2434', border:`1px solid ${C.blue}`, borderRadius:10, padding:16, marginBottom:16, textAlign:'center' }}>
                <div style={{ fontSize:28, marginBottom:6 }}>🎫</div>
                <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:900, fontSize:20, color:C.blue }}>SELAMAT!</div>
                <div style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white, marginTop:4 }}>Anda mendapat 1 voucher cuci gratis!</div>
              </div>
            )}
            <div style={{ textAlign:'center', fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, marginBottom:20 }}>Resi sudah dibuka di tab baru dan dicetak otomatis.</div>
            <button onClick={reset} style={btnRed}>Transaksi Baru</button>
          </div>
        )}
      </div>

      {/* Riwayat Hari Ini */}
      {(() => {
        const todayTrx = [...transactions]
          .filter(t => t.date === todayStr())
          .sort((a,b) => b.time.localeCompare(a.time))
        if (todayTrx.length === 0) return null
        const PM_BADGE = {
          cash:     { bg:'#0a1a0a', color:C.green  },
          qris:     { bg:'#0a1828', color:C.blue   },
          transfer: { bg:'#1a1a0a', color:C.amber  },
          voucher:  { bg:'#1a0a1a', color:'#a855f7'},
        }
        const thS = { padding:'10px 14px', textAlign:'left', fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }
        return (
          <div style={{ maxWidth:900, margin:'32px auto 0' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:12 }}>
              <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:20, color:C.white, letterSpacing:1 }}>RIWAYAT HARI INI</div>
              <span style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:20, padding:'2px 12px', fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:600, color:C.muted }}>{todayTrx.length} transaksi</span>
            </div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'auto' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:C.card }}>
                    {['Waktu','Plat',...(isMobile?[]:['Nama']),'Jenis Motor','Pekerja','Status','Pembayaran','Total','Aksi'].map(h => (
                      <th key={h} style={thS}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {todayTrx.map((t,i) => {
                    const pm = PM_BADGE[t.payment] || { bg:C.card, color:C.muted }
                    const isV = t.isVoucherRedemption
                    const isDone = t.status === 'selesai'
                    return (
                      <tr key={t.id} style={{ borderBottom:`1px solid ${C.border}`, background:i%2===0?'transparent':'rgba(255,255,255,0.015)' }}>
                        <td style={{ padding:'10px 14px', fontFamily:'Barlow Condensed, sans-serif', fontSize:15, fontWeight:700, color:C.muted }}>{t.time}</td>
                        <td style={{ padding:'10px 14px', fontFamily:'Barlow Condensed, sans-serif', fontSize:15, fontWeight:700, color:C.white, letterSpacing:0.5 }}>{t.plate}</td>
                        {!isMobile && <td style={{ padding:'10px 14px', fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white }}>{t.memberName}</td>}
                        <td style={{ padding:'10px 14px' }}>
                          <div style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{t.motorType?.name || (t.serviceType==='touchless'?'Touchless':t.serviceType==='manual'?'Manual':'—')}</div>
                          {t.notes && <div style={{ fontFamily:'Barlow, sans-serif', fontSize:11, color:C.muted, marginTop:2, fontStyle:'italic' }}>{t.notes}</div>}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          {t.workerId ? (
                            <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                              {(() => { const w=workers.find(x=>x.id===t.workerId); return w?<WorkerAvatar worker={w} size={24}/>:null })()}
                              <span style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.white }}>{t.workerName||'—'}</span>
                            </div>
                          ) : <span style={{ color:C.muted }}>—</span>}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          {isDone
                            ? <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:4, fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, background:'#0a1a0a', color:C.green }}>Selesai</span>
                            : <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:4, fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, background:'#1a1200', color:C.amber }}>Menunggu</span>
                          }
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:4, fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, background:pm.bg, color:pm.color }}>
                            {PAYMENT_LABELS[t.payment]}
                          </span>
                        </td>
                        <td style={{ padding:'10px 14px', fontFamily:'Barlow Condensed, sans-serif', fontSize:15, fontWeight:700, color:isV?'#a855f7':C.white }}>
                          {isV ? 'Gratis' : formatRp(t.totalAmount||t.amount)}
                        </td>
                        <td style={{ padding:'10px 14px' }}>
                          {!isDone && (
                            <button onClick={()=>setRatingTarget(t)} style={{ background:'none', border:`1px solid ${C.green}`, color:C.green, cursor:'pointer', padding:'4px 12px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:700, whiteSpace:'nowrap', minHeight:32 }}>✓ Selesai</button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}
    </div>
  )
}

/* ── Dashboard ── */
function DashboardPage({ members, transactions, workers }) {
  const isMobile = useIsMobile()
  const [hoverDay,    setHoverDay]    = useState(null)
  const [donutReady,  setDonutReady]  = useState(false)
  useEffect(() => { const id = setTimeout(() => setDonutReady(true), 150); return () => clearTimeout(id) }, [])

  const today    = todayStr()
  const totalRev = transactions.filter(t=>!t.isVoucherRedemption).reduce((s,t)=>s+(t.totalAmount||t.amount),0)
  const recent   = [...transactions].sort((a,b)=>b.id.localeCompare(a.id)).slice(0,6)

  /* Top Loyal */
  const RANK_BG = ['#f59e0b','#9ca3af','#b45309','#374151','#374151']
  const topLoyal = [...members].sort((a,b)=>b.washCount-a.washCount||b.totalSpent-a.totalSpent).slice(0,5)

  /* Month */
  const MONTHS_ID   = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']
  const monthStr    = today.slice(0,7)
  const nowDate     = new Date()
  const monthLabel  = `${MONTHS_ID[nowDate.getMonth()]} ${nowDate.getFullYear()}`
  const daysInMonth = new Date(nowDate.getFullYear(), nowDate.getMonth()+1, 0).getDate()
  const monthTrx    = transactions.filter(t=>t.date.startsWith(monthStr))
  const monthRevTrx = monthTrx.filter(t=>!t.isVoucherRedemption)

  /* Chart A */
  const dayRevData = {}
  for (let d=1; d<=daysInMonth; d++) {
    const ds = `${monthStr}-${String(d).padStart(2,'0')}`
    dayRevData[d] = monthRevTrx.filter(t=>t.date===ds).reduce((s,t)=>s+(t.totalAmount||t.amount),0)
  }
  const maxDayRev   = Math.max(...Object.values(dayRevData), 1)
  const monthRevSum = Object.values(dayRevData).reduce((s,v)=>s+v,0)
  const abbrevRp    = (n) => n>=1000000?`${(n/1000000).toFixed(1)}jt`:n>=1000?`${Math.round(n/1000)}k`:'0'

  /* Chart B */
  const PM_SEGS = [
    { key:'cash',     label:'Cash',     color:'#22c55e' },
    { key:'qris',     label:'QRIS',     color:C.blue    },
    { key:'transfer', label:'Transfer', color:C.amber   },
    { key:'voucher',  label:'Voucher',  color:'#a855f7' },
  ]
  const totalMonthTrx = monthTrx.length
  const CIRC = 2 * Math.PI * 60
  let cumArc = 0
  const pmArcs = PM_SEGS.map(s => {
    const count   = monthTrx.filter(t=>t.payment===s.key).length
    const dashLen = totalMonthTrx > 0 ? (count/totalMonthTrx)*CIRC : 0
    const offset  = cumArc
    cumArc += dashLen
    return { ...s, count, dashLen, offset, pct:totalMonthTrx>0?Math.round(count/totalMonthTrx*100):0 }
  }).filter(s=>s.count>0)

  /* Chart C */
  const motorDist = {}
  monthTrx.forEach(t => {
    const n = t.motorType?.name || (t.serviceType==='touchless'?'Touchless':t.serviceType==='manual'?'Manual':'Lainnya')
    if (!motorDist[n]) motorDist[n] = { count:0, revenue:0 }
    motorDist[n].count++
    motorDist[n].revenue += (t.totalAmount||t.amount||0)
  })
  const motorList     = Object.entries(motorDist).sort((a,b)=>b[1].count-a[1].count)
  const maxMotorCount = Math.max(...motorList.map(([,v])=>v.count), 1)

  const StatCard = ({label:lb,value,sub}) => (
    <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:'22px 24px' }}>
      <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>{lb}</div>
      <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:900, fontSize:34, color:C.white, lineHeight:1 }}>{value}</div>
      {sub && <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, marginTop:6 }}>{sub}</div>}
    </div>
  )

  return (
    <div style={{ padding:isMobile?'16px':' 40px 24px', background:C.bg, minHeight:'100vh' }}>
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:isMobile?22:28, color:C.white, marginBottom:isMobile?16:28, letterSpacing:1 }}>DASHBOARD</div>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:isMobile?10:16, marginBottom:isMobile?20:32 }}>
          <StatCard label="Total Member"     value={members.length}       sub="member terdaftar" />
          <StatCard label="Total Transaksi"  value={transactions.length}  sub="semua waktu" />
          <StatCard label="Total Pendapatan" value={formatRp(totalRev)}   sub="dari cuci berbayar" />
          <StatCard label="Cuci Hari Ini"    value={transactions.filter(t=>t.date===today).length} sub={today} />
        </div>

        {/* Recent + Top Loyal */}
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'2fr 1fr', gap:isMobile?16:24, marginBottom:isMobile?20:32 }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:24 }}>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:18, color:C.white, marginBottom:16 }}>TRANSAKSI TERBARU</div>
            {recent.length===0
              ? <div style={{ color:C.muted, fontFamily:'Barlow, sans-serif', fontSize:14, textAlign:'center', padding:'32px 0' }}>Belum ada transaksi</div>
              : recent.map((t,i) => (
                  <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderBottom:i<recent.length-1?`1px solid ${C.border}`:'none' }}>
                    <div>
                      <div style={{ fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:14, color:C.white }}>{t.memberName}</div>
                      <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted }}>{t.plate} · {fmtDate(t.date)} {t.time}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:16, color:t.isVoucherRedemption?C.blue:C.white }}>{t.isVoucherRedemption?'Voucher':formatRp(t.totalAmount||t.amount)}</div>
                      <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted }}>{PAYMENT_LABELS[t.payment]}</div>
                    </div>
                  </div>
                ))
            }
          </div>

          {/* Top Loyal Customer */}
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:24 }}>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:18, color:C.white, marginBottom:16 }}>TOP LOYAL CUSTOMER</div>
            {members.length===0
              ? <div style={{ color:C.muted, fontFamily:'Barlow, sans-serif', fontSize:14, textAlign:'center', padding:'32px 0' }}>Belum ada data member</div>
              : topLoyal.map((m,i) => (
                  <div key={m.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:i<topLoyal.length-1?`1px solid ${C.border}`:'none' }}>
                    <div style={{ width:28, height:28, borderRadius:'50%', background:RANK_BG[i], display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:13, color:'#fff' }}>{i+1}</span>
                    </div>
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ fontFamily:'Barlow, sans-serif', fontWeight:700, fontSize:14, color:C.white, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{m.name}</div>
                      <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted }}>{m.plate}</div>
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:14, color:C.blue }}>{m.washCount}x cuci</div>
                      <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted }}>{formatRp(m.totalSpent)}</div>
                    </div>
                  </div>
                ))
            }
          </div>
        </div>

        {/* Statistik Bulan Ini */}
        <div style={{ display:'flex', alignItems:'baseline', gap:12, marginBottom:16 }}>
          <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:22, color:C.white, letterSpacing:1 }}>STATISTIK BULAN INI</div>
          <div style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{monthLabel}</div>
        </div>

        {monthTrx.length===0 ? (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:40, textAlign:'center', color:C.muted, fontFamily:'Barlow, sans-serif', fontSize:14 }}>
            Belum ada transaksi bulan ini
          </div>
        ) : (<>
          {/* Chart A + B */}
          <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'3fr 2fr', gap:16, marginBottom:16 }}>

            {/* Chart A: Daily Revenue */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
              <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:16, color:C.white }}>Pendapatan Harian</div>
              <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, marginBottom:14 }}>{formatRp(monthRevSum)} bulan ini</div>
              <div style={{ display:'flex', gap:8, height:200, alignItems:'stretch' }}>
                {/* Y labels */}
                <div style={{ display:'flex', flexDirection:'column', justifyContent:'space-between', paddingBottom:20, flexShrink:0, width:28 }}>
                  <div style={{ fontFamily:'Barlow, sans-serif', fontSize:10, color:C.muted, textAlign:'right' }}>{abbrevRp(maxDayRev)}</div>
                  <div style={{ fontFamily:'Barlow, sans-serif', fontSize:10, color:C.muted, textAlign:'right' }}>{abbrevRp(Math.round(maxDayRev/2))}</div>
                  <div style={{ fontFamily:'Barlow, sans-serif', fontSize:10, color:C.muted, textAlign:'right' }}>0</div>
                </div>
                {/* Bars */}
                <div style={{ display:'flex', alignItems:'flex-end', gap:2, flex:1, height:'100%' }}>
                  {Array.from({length:daysInMonth},(_,i)=>i+1).map(day => {
                    const rev  = dayRevData[day] || 0
                    const barH = rev>0 ? Math.max((rev/maxDayRev)*180, 3) : 0
                    const isH  = hoverDay===day
                    return (
                      <div key={day} style={{ flex:1, minWidth:6, maxWidth:28, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', height:'100%', position:'relative', cursor:rev>0?'pointer':'default' }}
                        onMouseEnter={()=>rev>0&&setHoverDay(day)} onMouseLeave={()=>setHoverDay(null)}>
                        {isH && (
                          <div style={{ position:'absolute', bottom:barH+24, left:'50%', transform:'translateX(-50%)', background:'#333', color:'#fff', padding:'3px 7px', borderRadius:4, fontSize:10, whiteSpace:'nowrap', zIndex:10 }}>
                            {formatRp(rev)}
                          </div>
                        )}
                        <div style={{ width:'100%', height:barH, background:isH?'#2a7fb8':C.blue, borderRadius:'4px 4px 0 0', transition:'background 0.1s' }} />
                        <div style={{ height:20, display:'flex', alignItems:'center', fontFamily:'Barlow, sans-serif', fontSize:10, color:isH?C.white:C.muted }}>{day}</div>
                      </div>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* Chart B: Donut */}
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
              <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:16, color:C.white, marginBottom:16 }}>Metode Pembayaran</div>
              <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                <svg width="160" height="160" viewBox="0 0 160 160">
                  <circle cx={80} cy={80} r={60} fill="none" stroke={C.border} strokeWidth={28} />
                  {pmArcs.map(arc => (
                    <circle key={arc.key} cx={80} cy={80} r={60} fill="none"
                      stroke={arc.color} strokeWidth={28}
                      strokeDasharray={`${donutReady?arc.dashLen:0} ${CIRC}`}
                      strokeDashoffset={-arc.offset}
                      transform="rotate(-90 80 80)"
                      style={{ transition:'stroke-dasharray 0.7s ease' }} />
                  ))}
                  <text x={80} y={75} textAnchor="middle" fill={C.white} fontSize={24} fontWeight={700} fontFamily="Barlow Condensed, sans-serif">{totalMonthTrx}</text>
                  <text x={80} y={93} textAnchor="middle" fill={C.muted} fontSize={11} fontFamily="Barlow, sans-serif">transaksi</text>
                </svg>
                <div style={{ width:'100%', marginTop:12, display:'flex', flexDirection:'column', gap:8 }}>
                  {pmArcs.map(arc => (
                    <div key={arc.key} style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ width:10, height:10, borderRadius:'50%', background:arc.color, flexShrink:0 }} />
                      <div style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white, flex:1 }}>{arc.label}</div>
                      <span style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:14, color:C.white }}>{arc.count}</span>
                      <span style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, width:36, textAlign:'right' }}>{arc.pct}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Chart C: Motor Type Distribution */}
          {motorList.length>0 && (
            <div style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:20 }}>
              <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:16, color:C.white, marginBottom:16 }}>Distribusi Jenis Motor</div>
              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {motorList.map(([name,{count,revenue}]) => (
                  <div key={name} style={{ display:'flex', alignItems:'center', gap:14 }}>
                    <div style={{ width:120, fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white, flexShrink:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                    <div style={{ flex:1, height:12, background:C.surface, borderRadius:6, overflow:'hidden' }}>
                      <div style={{ width:`${(count/maxMotorCount)*100}%`, height:'100%', background:'linear-gradient(90deg,#3B9FD4,#E8372A)', borderRadius:6, transition:'width 0.7s ease' }} />
                    </div>
                    <span style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:14, color:C.blue, flexShrink:0 }}>{count} cuci</span>
                    <span style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, flexShrink:0, minWidth:90, textAlign:'right' }}>{formatRp(revenue)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>)}
      </div>
    </div>
  )
}

/* ── Member ── */
const MEMBER_COLS = [
  { key:'id',         label:'ID',         sorter:(a,b)=>a.id.localeCompare(b.id)           },
  { key:'plate',      label:'Plat',       sorter:(a,b)=>a.plate.localeCompare(b.plate)      },
  { key:'name',       label:'Nama',       sorter:(a,b)=>a.name.localeCompare(b.name)        },
  { key:'phone',      label:'Telepon',    sorter:(a,b)=>a.phone.localeCompare(b.phone)      },
  { key:'washCount',  label:'Cuci',       sorter:(a,b)=>a.washCount  - b.washCount          },
  { key:'vouchers',   label:'Voucher',    sorter:(a,b)=>a.vouchers   - b.vouchers           },
  { key:'totalSpent', label:'Total Bayar',sorter:(a,b)=>a.totalSpent - b.totalSpent         },
]

function MemberPage({ members, transactions }) {
  const isMobile = useIsMobile()
  const [search,     setSearch]     = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [sort,       setSort]       = useState({ column:'id', direction:'asc' })

  const filtered = members.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    normalizePlate(m.plate).includes(normalizePlate(search)) ||
    m.phone.includes(search)
  )

  const col    = MEMBER_COLS.find(c=>c.key===sort.column)
  const sorted = [...filtered].sort((a,b) => col ? (sort.direction==='asc' ? col.sorter(a,b) : col.sorter(b,a)) : 0)

  const handleSort = (key) => setSort(prev => prev.column===key ? { column:key, direction:prev.direction==='asc'?'desc':'asc' } : { column:key, direction:'asc' })

  const sel    = selectedId ? members.find(m=>m.id===selectedId) : null
  const selTrx = sel ? transactions.filter(t=>t.memberId===sel.id).sort((a,b)=>b.id.localeCompare(a.id)) : []

  const thStyle = (key) => ({
    padding:'12px 16px', textAlign:'left', fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700,
    color: sort.column===key ? C.red : C.muted,
    textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap',
    cursor:'pointer', userSelect:'none',
  })
  const td = (ex) => ({ padding:'12px 16px', ...ex })

  return (
    <div style={{ padding:'40px 24px', background:C.bg, minHeight:'100vh' }}>
      <div style={{ maxWidth:1200, margin:'0 auto' }}>
        <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:isMobile?22:28, color:C.white, marginBottom:isMobile?14:24, letterSpacing:1 }}>DATA MEMBER</div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari nama, plat, atau nomor telepon..." style={{ ...inputBase, maxWidth:isMobile?'100%':400, marginBottom:16 }} />
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':(sel?'1fr 380px':'1fr'), gap:isMobile?16:24 }}>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:C.card }}>
                  {MEMBER_COLS.filter(c=>!(isMobile&&c.key==='phone')).map(c => (
                    <th key={c.key} onClick={()=>handleSort(c.key)} style={thStyle(c.key)}
                      onMouseEnter={e=>e.currentTarget.style.color=C.white}
                      onMouseLeave={e=>e.currentTarget.style.color=sort.column===c.key?C.red:C.muted}>
                      {c.label}{sort.column===c.key ? (sort.direction==='asc' ? ' ↑' : ' ↓') : ''}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.length===0
                  ? <tr><td colSpan={isMobile?6:7} style={{ padding:32, textAlign:'center', fontFamily:'Barlow, sans-serif', fontSize:14, color:C.muted }}>Tidak ada member ditemukan</td></tr>
                  : sorted.map(m => (
                      <tr key={m.id} onClick={()=>setSelectedId(selectedId===m.id?null:m.id)} style={{ cursor:'pointer', background:selectedId===m.id?'#12263a':'transparent', borderBottom:`1px solid ${C.border}`, transition:'background 0.15s' }}>
                        <td style={td({fontFamily:'Barlow, sans-serif',fontSize:12,color:C.muted})}>{m.id}</td>
                        <td style={td({fontFamily:'Barlow Condensed, sans-serif',fontSize:16,fontWeight:700,color:C.white})}>{m.plate}</td>
                        <td style={td({fontFamily:'Barlow, sans-serif',fontSize:14,color:C.white,fontWeight:600})}>{m.name}</td>
                        {!isMobile && <td style={td({fontFamily:'Barlow, sans-serif',fontSize:13,color:C.muted})}>{m.phone}</td>}
                        <td style={td({fontFamily:'Barlow Condensed, sans-serif',fontSize:17,fontWeight:700,color:C.white})}>{m.washCount}x</td>
                        <td style={td({fontFamily:'Barlow Condensed, sans-serif',fontSize:17,fontWeight:700,color:m.vouchers>0?C.blue:C.muted})}>{m.vouchers>0?`🎫 ${m.vouchers}`:'—'}</td>
                        <td style={td({fontFamily:'Barlow Condensed, sans-serif',fontSize:15,fontWeight:700,color:C.white})}>{formatRp(m.totalSpent)}</td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
          {sel && (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:24, alignSelf:'start' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
                <div>
                  <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:900, fontSize:22, color:C.white }}>{sel.name}</div>
                  <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:600, fontSize:16, color:C.muted, letterSpacing:1 }}>{sel.plate}</div>
                </div>
                <button onClick={()=>setSelectedId(null)} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:22, padding:0, lineHeight:1 }}>×</button>
              </div>
              {[['ID Member',sel.id],['Nomor Telepon',sel.phone],['Bergabung',fmtDate(sel.joinDate)],['Total Cuci',`${sel.washCount}x`],['Voucher',sel.vouchers>0?`${sel.vouchers} voucher`:'Tidak ada'],['Total Pengeluaran',formatRp(sel.totalSpent)]].map(([k,v]) => (
                <div key={k} style={{ display:'flex', justifyContent:'space-between', padding:'9px 0', borderBottom:`1px solid ${C.border}` }}>
                  <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{k}</span>
                  <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white, fontWeight:600 }}>{v}</span>
                </div>
              ))}
              <div style={{ marginTop:16, marginBottom:6 }}>{lbl('PROGRESS LOYALITAS')}<LoyaltyBar washCount={sel.washCount} big /></div>
              <div style={{ marginTop:20 }}>
                <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:16, color:C.white, marginBottom:10 }}>RIWAYAT CUCI</div>
                <div style={{ maxHeight:260, overflowY:'auto' }}>
                  {selTrx.length===0
                    ? <div style={{ color:C.muted, fontFamily:'Barlow, sans-serif', fontSize:13 }}>Belum ada riwayat</div>
                    : selTrx.map(t => (
                        <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${C.border}` }}>
                          <div>
                            <div style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white }}>{fmtDate(t.date)} {t.time}</div>
                            <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted }}>{PAYMENT_LABELS[t.payment]}{t.earnedVoucher?' · 🎫 Voucher':''}</div>
                          </div>
                          <span style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:15, color:t.isVoucherRedemption?C.blue:C.white }}>{t.isVoucherRedemption?'GRATIS':formatRp(t.totalAmount||t.amount)}</span>
                        </div>
                      ))
                  }
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── TrxEditModal ── */
function TrxEditModal({ trx, motorTypes, onSave, onClose, addToast }) {
  const isMobile = useIsMobile()
  const [payment, setPayment] = useState(trx.payment)
  const [amount,  setAmount]  = useState(String(trx.totalAmount ?? trx.amount ?? 0))
  const [notes,   setNotes]   = useState(trx.notes || '')
  const [kasir,   setKasir]   = useState(trx.kasir || '')
  const [status,  setStatus]  = useState(trx.status || 'menunggu')
  const [motorId, setMotorId] = useState(trx.motorType?.id || '')

  const submit = () => {
    const n = Number(amount)
    if (isNaN(n) || n < 0) { addToast('Jumlah tidak valid', 'error'); return }
    const selMotor = motorTypes.find(m => m.id === motorId)
    const newMotorName = selMotor?.name || trx.motorType?.name || ''
    const oldMotorName = trx.motorType?.name || ''
    const oldAmt = trx.totalAmount ?? trx.amount ?? 0
    const changes = []
    if (newMotorName !== oldMotorName) changes.push({ field:'motorType.name', from:oldMotorName, to:newMotorName })
    if (payment !== trx.payment)       changes.push({ field:'payment', from:trx.payment, to:payment })
    if (n !== oldAmt)                  changes.push({ field:'totalAmount', from:oldAmt, to:n })
    if ((notes||'') !== (trx.notes||'')) changes.push({ field:'notes', from:trx.notes||'', to:notes||'' })
    if ((kasir||'') !== (trx.kasir||'')) changes.push({ field:'kasir', from:trx.kasir||'', to:kasir||'' })
    if (status !== (trx.status||''))   changes.push({ field:'status', from:trx.status||'', to:status })
    const updated = { ...trx, payment, totalAmount:n, amount:n, notes:notes||null, kasir, status,
      motorType: selMotor ? { ...(trx.motorType||{}), id:selMotor.id, name:selMotor.name, price:selMotor.price } : trx.motorType }
    onSave(updated, changes)
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:isMobile?'flex-end':'center', justifyContent:'center', padding:isMobile?0:24 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:isMobile?'16px 16px 0 0':16, padding:isMobile?'24px 20px 32px':32, width:isMobile?'100%':480, maxHeight:isMobile?'90vh':'auto', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18 }}>
          <div>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:20, color:C.white }}>Edit Transaksi</div>
            <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, marginTop:2 }}>{trx.id} · {trx.plate} · {trx.memberName}</div>
          </div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:22, padding:0 }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:13 }}>
          <div>{lbl('Jenis Motor')}<select value={motorId} onChange={e=>setMotorId(e.target.value)} style={{ ...inputBase, cursor:'pointer' }}>
            <option value="">— tidak diubah —</option>
            {(motorTypes||[]).map(m=><option key={m.id} value={m.id}>{m.name} ({formatRp(m.price)})</option>)}
          </select></div>
          <div>{lbl('Metode Pembayaran')}<select value={payment} onChange={e=>setPayment(e.target.value)} style={{ ...inputBase, cursor:'pointer' }}>
            {Object.entries(PAYMENT_LABELS).map(([k,v])=><option key={k} value={k}>{v}</option>)}
          </select></div>
          <div>{lbl('Total (Rp)')}<input type="number" value={amount} onChange={e=>setAmount(e.target.value)} min="0" style={inputBase} /></div>
          <div>{lbl('Catatan')}<input value={notes} onChange={e=>setNotes(e.target.value)} placeholder="Catatan motor" style={inputBase} /></div>
          <div>{lbl('Kasir')}<input value={kasir} onChange={e=>setKasir(e.target.value)} style={inputBase} /></div>
          <div>{lbl('Status')}<select value={status} onChange={e=>setStatus(e.target.value)} style={{ ...inputBase, cursor:'pointer' }}>
            <option value="menunggu">Menunggu</option><option value="selesai">Selesai</option>
          </select></div>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} style={btnGhost}>Batal</button>
            <button onClick={submit} style={btnRed}>Simpan</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Riwayat ── */
function RiwayatPage({ transactions, completeTransaction, updateTransaction, deleteTransaction, motorTypes, currentUser, writeAuditLog, addToast }) {
  const isMobile = useIsMobile()
  const [filter,      setFilter]      = useState('all')
  const [ratingTarget,setRatingTarget] = useState(null)
  const [editTarget,  setEditTarget]   = useState(null)
  const canEdit = currentUser?.permissions?.includes('riwayat_edit')

  const handleEditSave = (updated, changes) => {
    if (changes.length > 0) {
      writeAuditLog?.('riwayat', 'edit', updated.id, changes)
      updateTransaction?.(updated)
      addToast?.('Transaksi diperbarui', 'success')
    }
    setEditTarget(null)
  }
  const handleDeleteTrx = (t) => {
    if (!window.confirm(`Hapus transaksi ${t.id}?`)) return
    writeAuditLog?.('riwayat', 'delete', t.id, [{ field:'status', from:'exists', to:'deleted' }])
    deleteTransaction?.(t.id)
    addToast?.(`Transaksi ${t.id} dihapus`, 'warn')
  }
  const sorted = [...(filter==='all'?transactions:transactions.filter(t=>t.payment===filter))].sort((a,b)=>b.id.localeCompare(a.id))
  const summary = ['cash','qris','transfer','voucher'].map(m=>({ method:m, count:transactions.filter(t=>t.payment===m).length, total:transactions.filter(t=>t.payment===m&&!t.isVoucherRedemption).reduce((s,t)=>s+(t.totalAmount||t.amount),0) }))
  const th = { padding:'12px 16px', textAlign:'left', fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }
  const badge = (pm) => { const map={cash:{bg:'#0a1a0a',color:C.green},qris:{bg:'#1a0a2a',color:'#a78bfa'},transfer:{bg:'#1a1a0a',color:C.amber},voucher:{bg:'#0a2434',color:C.blue}}; return { display:'inline-block', padding:'3px 10px', borderRadius:20, fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:600, ...map[pm] } }
  return (
    <div style={{ padding:'40px 24px', background:C.bg, minHeight:'100vh' }}>
      {ratingTarget && <RatingModal trx={ratingTarget} onComplete={(r)=>{ completeTransaction&&completeTransaction(ratingTarget.id,r); setRatingTarget(null) }} onClose={()=>setRatingTarget(null)} />}
      {editTarget && <TrxEditModal trx={editTarget} motorTypes={motorTypes||[]} onSave={handleEditSave} onClose={()=>setEditTarget(null)} addToast={addToast||(()=>{})} />}
      <div style={{ maxWidth:1100, margin:'0 auto' }}>
        <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:isMobile?22:28, color:C.white, marginBottom:isMobile?14:24, letterSpacing:1 }}>RIWAYAT TRANSAKSI</div>
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)', gap:isMobile?8:12, marginBottom:isMobile?16:24 }}>
          {summary.map(s => (
            <div key={s.method} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:'14px 18px' }}>
              <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, marginBottom:4 }}>{PAYMENT_LABELS[s.method]}</div>
              <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:22, color:s.method==='voucher'?C.blue:C.white }}>{s.method==='voucher'?`${s.count}x`:formatRp(s.total)}</div>
              <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted }}>{s.count} transaksi</div>
            </div>
          ))}
        </div>
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:'center' }}>
          {[['all','Semua'],['cash','Cash'],['qris','QRIS'],['transfer','Transfer'],['voucher','Voucher']].map(([val,lb]) => (
            <button key={val} onClick={()=>setFilter(val)} style={{ background:filter===val?C.red:C.surface, border:`1px solid ${filter===val?C.red:C.border}`, color:filter===val?'#fff':C.muted, cursor:'pointer', padding:'7px 18px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:13, transition:'all 0.15s' }}>{lb}</button>
          ))}
          <span style={{ marginLeft:'auto', fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{sorted.length} transaksi</span>
        </div>
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead><tr style={{ background:C.card }}>{(isMobile?['Tanggal','Plat','Nama','Layanan','Status','Rating','Metode','Jumlah']:['ID','Tanggal','Waktu','Plat','Nama','Layanan','Pekerja','Status','Rating','Durasi','Kasir','Metode','Jumlah',...(canEdit?['Aksi']:[])]).map(h=><th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {sorted.length===0
                ? <tr><td colSpan={9} style={{ padding:32, textAlign:'center', fontFamily:'Barlow, sans-serif', fontSize:14, color:C.muted }}>Tidak ada transaksi</td></tr>
                : sorted.map(t => (
                    <tr key={t.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                      {!isMobile && <td style={{ padding:'12px 16px', fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted }}>{t.id}</td>}
                      <td style={{ padding:'12px 16px', fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white }}>{fmtDate(t.date)}</td>
                      {!isMobile && <td style={{ padding:'12px 16px', fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{t.time}</td>}
                      <td style={{ padding:'12px 16px', fontFamily:'Barlow Condensed, sans-serif', fontSize:16, fontWeight:700, color:C.white }}>{t.plate}</td>
                      <td style={{ padding:'12px 16px', fontFamily:'Barlow, sans-serif', fontSize:14, color:C.white }}>{t.memberName}</td>
                      <td style={{ padding:'12px 16px', fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{t.motorType?.name||(t.serviceType==='touchless'?'Touchless':t.serviceType==='manual'?'Manual':'-')}</td>
                      {!isMobile && <td style={{ padding:'12px 16px', fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{t.workerName||'—'}</td>}
                      <td style={{ padding:'12px 16px' }}>
                        {t.status==='selesai'
                          ? <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:4, fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, background:'#0a1a0a', color:C.green }}>Selesai</span>
                          : <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:4, fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, background:'#1a1200', color:C.amber }}>Menunggu</span>
                        }
                        {t.status!=='selesai' && completeTransaction && (
                          <button onClick={()=>setRatingTarget(t)} style={{ display:'block', marginTop:4, background:'none', border:`1px solid ${C.green}`, color:C.green, cursor:'pointer', padding:'2px 8px', borderRadius:4, fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700 }}>✓ Selesai</button>
                        )}
                      </td>
                      <td style={{ padding:'12px 16px', fontFamily:'Barlow, sans-serif', fontSize:13, color:'#f59e0b' }}>
                        {t.rating ? '★'.repeat(t.rating) : <span style={{ color:C.muted }}>—</span>}
                      </td>
                      {!isMobile && <td style={{ padding:'12px 16px', fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>
                        {t.completedAt&&t.createdAt ? `${Math.round((new Date(t.completedAt)-new Date(t.createdAt))/60000)} mnt` : '—'}
                      </td>}
                      {!isMobile && <td style={{ padding:'12px 16px', fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{t.kasir}</td>}
                      <td style={{ padding:'12px 16px' }}><span style={badge(t.payment)}>{PAYMENT_LABELS[t.payment]}</span></td>
                      <td style={{ padding:'12px 16px', fontFamily:'Barlow Condensed, sans-serif', fontSize:16, fontWeight:700, color:t.isVoucherRedemption?C.blue:C.white }}>{t.isVoucherRedemption?'GRATIS':formatRp(t.totalAmount||t.amount)}</td>
                      {!isMobile && canEdit && (
                        <td style={{ padding:'12px 16px' }}>
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={()=>setEditTarget(t)} style={{ background:'none', border:`1px solid ${C.blue}`, color:C.blue, cursor:'pointer', padding:'4px 12px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:600, minHeight:32 }}>Edit</button>
                            <button onClick={()=>handleDeleteTrx(t)} style={{ background:'none', border:`1px solid ${C.red}`, color:C.red, cursor:'pointer', padding:'4px 12px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:600, minHeight:32 }}>Hapus</button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

/* ── Workers ── */
const compressImage = (file) => new Promise((resolve) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 200; canvas.height = 200
      const ctx = canvas.getContext('2d')
      const size = Math.min(img.width, img.height)
      const sx = (img.width - size) / 2
      const sy = (img.height - size) / 2
      ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200)
      const result = canvas.toDataURL('image/jpeg', 0.7)
      if (result.length > 500000) console.warn('Worker photo large:', Math.round(result.length/1024), 'KB')
      resolve(result)
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
})

function WorkerAvatar({ worker, size=44 }) {
  if (worker.photo) return (
    <img src={worker.photo} alt={worker.name}
      style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
  )
  const initials = worker.name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase()
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:C.blue, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
      <span style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:Math.round(size*0.35), color:'#fff' }}>{initials}</span>
    </div>
  )
}

function WorkerModal({ mode, entry, onSave, onClose, addToast }) {
  const isMobile = useIsMobile()
  const [name,    setName]    = useState(entry?.name   || '')
  const [photo,   setPhoto]   = useState(entry?.photo  || null)
  const [preview, setPreview] = useState(entry?.photo  || null)
  const [active,  setActive]  = useState(entry?.active ?? true)

  const handleFile = async (e) => {
    const file = e.target.files[0]
    if (!file) return
    const compressed = await compressImage(file)
    setPhoto(compressed); setPreview(compressed)
  }

  const submit = () => {
    if (!name.trim()) { addToast('Masukkan nama pekerja', 'error'); return }
    onSave({ name:name.trim(), photo, active })
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:isMobile?'flex-end':'center', justifyContent:'center', padding:isMobile?0:24 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:isMobile?'16px 16px 0 0':16, padding:isMobile?'24px 20px 32px':32, width:isMobile?'100%':400 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:20, color:C.white }}>{mode==='add'?'Tambah':'Edit'} Pekerja</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:22, padding:0 }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Photo */}
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {preview
              ? <img src={preview} style={{ width:72, height:72, borderRadius:'50%', objectFit:'cover', flexShrink:0 }} />
              : <div style={{ width:72, height:72, borderRadius:'50%', background:C.card, border:`2px dashed ${C.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                  <span style={{ color:C.muted, fontSize:11 }}>Foto</span>
                </div>
            }
            <div>
              {lbl('Foto Pekerja (opsional)')}
              <input type="file" accept="image/*" onChange={handleFile}
                style={{ color:C.muted, fontFamily:'Barlow, sans-serif', fontSize:13, width:'100%' }} />
            </div>
          </div>
          <div>{lbl('Nama Pekerja')}<input value={name} onChange={e=>setName(e.target.value)} placeholder="Masukkan nama" style={inputBase} autoFocus /></div>
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'10px 14px', background:C.card, borderRadius:8, border:`1px solid ${C.border}` }}>
            <input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} style={{ accentColor:C.green, width:16, height:16 }} />
            <span style={{ fontFamily:'Barlow, sans-serif', fontSize:14, color:C.white }}>Aktif</span>
          </label>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} style={btnGhost}>Batal</button>
            <button onClick={submit} style={btnRed}>Simpan</button>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ── Settings ── */
function PermCheckboxes({ perms, setPerms }) {
  const toggle = (key) => setPerms(perms.includes(key)?perms.filter(p=>p!==key):[...perms,key])
  return (
    <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
      {PERM_META.map(p => {
        const on = perms.includes(p.key)
        return (
          <label key={p.key} style={{ display:'flex', alignItems:'center', gap:6, cursor:'pointer', background:on?p.bg:C.card, border:`1px solid ${on?p.color:C.border}`, borderRadius:6, padding:'6px 12px', transition:'all 0.15s' }}>
            <input type="checkbox" checked={on} onChange={()=>toggle(p.key)} style={{ accentColor:p.color, width:14, height:14, cursor:'pointer' }} />
            <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, fontWeight:600, color:on?p.color:C.muted }}>{p.label}</span>
          </label>
        )
      })}
    </div>
  )
}

function MotorTypeModal({ mode, entry, onSave, onClose, addToast }) {
  const isMobile = useIsMobile()
  const [name,   setName]   = useState(entry?.name   || '')
  const [price,  setPrice]  = useState(entry ? String(entry.price) : '')
  const [active, setActive] = useState(entry?.active ?? true)
  const submit = () => {
    if (!name.trim())                              { addToast('Masukkan nama motor', 'error'); return }
    const p = Number(price)
    if (!price || isNaN(p) || p < 1000)           { addToast('Harga minimal Rp 1.000', 'error'); return }
    onSave({ name:name.trim(), price:p, active })
  }
  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:isMobile?'flex-end':'center', justifyContent:'center', padding:isMobile?0:24 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:isMobile?'16px 16px 0 0':16, padding:isMobile?'24px 20px 32px':32, width:isMobile?'100%':380 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:22 }}>
          <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:20, color:C.white }}>{mode==='add'?'Tambah':'Edit'} Tipe Motor</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:22, padding:0 }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>{lbl('Nama Motor')}<input value={name} onChange={e=>setName(e.target.value)} placeholder="Contoh: Matic, Sport" style={inputBase} autoFocus /></div>
          <div>{lbl('Harga (Rp)')}<input type="number" value={price} onChange={e=>setPrice(e.target.value)} placeholder="23000" min="1000" style={inputBase} /></div>
          <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'10px 14px', background:C.card, borderRadius:8, border:`1px solid ${C.border}` }}>
            <input type="checkbox" checked={active} onChange={e=>setActive(e.target.checked)} style={{ accentColor:C.green, width:16, height:16 }} />
            <span style={{ fontFamily:'Barlow, sans-serif', fontSize:14, color:C.white }}>Aktif</span>
          </label>
          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} style={btnGhost}>Batal</button>
            <button onClick={submit} style={btnRed}>Simpan</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function SettingsPage({ users, addUser, updateUser, deleteUser, motorTypes, addMotorType, updateMotorType, deleteMotorType, toggleMotorType, workers, addWorker, updateWorker, deleteWorker, toggleWorker, auditLog, currentUser, writeAuditLog, addToast }) {
  const isMobile = useIsMobile()
  const isOwner  = currentUser?.username === 'owner'
  const [tab,      setTab]      = useState(isOwner ? 'pengguna' : 'gantipw')
  const [logFrom,  setLogFrom]  = useState(() => new Date(Date.now()-7*24*60*60*1000).toISOString().slice(0,10))
  const [logTo,    setLogTo]    = useState(todayStr())
  const [logMod,   setLogMod]   = useState('all')
  const [logSrch,  setLogSrch]  = useState('')
  const [logPg,    setLogPg]    = useState(0)
  const [oldPw,    setOldPw]    = useState('')
  const [newPw,    setNewPw]    = useState('')
  const [confPw,   setConfPw]   = useState('')
  const [pwErrors, setPwErrors] = useState({})
  const [pwSuccess,setPwSuccess]= useState(false)
  const [newName,     setNewName]     = useState('')
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newPerms,    setNewPerms]    = useState([])
  const [editingId,   setEditingId]   = useState(null)
  const [editPerms,   setEditPerms]   = useState([])
  const [motorModal,  setMotorModal]  = useState(null)
  const [workerModal, setWorkerModal] = useState(null)

  const clrPw = (f) => setPwErrors(p=>({...p,[f]:undefined}))
  const handlePwSubmit = () => {
    const e = {}
    if (oldPw !== currentUser.password) e.old = 'Password lama salah'
    if (newPw.length < 6) e.new = 'Password minimal 6 karakter'
    else if (newPw === oldPw) e.new = 'Password baru harus berbeda dari password lama'
    if (newPw !== confPw) e.conf = 'Konfirmasi password tidak cocok'
    if (Object.values(e).some(Boolean)) { setPwErrors(e); return }
    updateUser({ ...currentUser, password:newPw })
    writeAuditLog?.('pengaturan', 'edit', currentUser.username, [{ field:'password', from:'***', to:'***' }])
    setPwSuccess(true)
    setOldPw(''); setNewPw(''); setConfPw(''); setPwErrors({})
    setTimeout(() => setPwSuccess(false), 2000)
  }

  const handleAdd = () => {
    if (!newName.trim())     { addToast('Masukkan nama','error'); return }
    if (!newUsername.trim()) { addToast('Masukkan username','error'); return }
    if (!newPassword.trim()) { addToast('Masukkan password','error'); return }
    if (newPerms.length===0) { addToast('Pilih minimal 1 akses tab','error'); return }
    if (users.find(u=>u.username===newUsername.trim())) { addToast('Username sudah digunakan','error'); return }
    addUser({ id:'u'+Date.now(), username:newUsername.trim(), password:newPassword.trim(), name:newName.trim(), permissions:newPerms })
    writeAuditLog?.('pengaturan','add',newUsername.trim(),[{field:'user',from:'-',to:newName.trim()}])
    addToast(`Pengguna ${newName.trim()} berhasil ditambahkan`,'success')
    setNewName(''); setNewUsername(''); setNewPassword(''); setNewPerms([])
  }
  const startEdit      = (u) => { setEditingId(u.id); setEditPerms([...u.permissions]) }
  const cancelEdit     = ()  => setEditingId(null)
  const handleSave     = (u) => {
    if (editPerms.length===0) { addToast('Pilih minimal 1 akses tab','error'); return }
    updateUser({...u, permissions:editPerms})
    writeAuditLog?.('pengaturan','edit',u.username,[{field:'permissions',from:u.permissions.join(','),to:editPerms.join(',')}])
    addToast(`Akses ${u.name} diperbarui`,'success')
    setEditingId(null)
  }
  const handleDeleteUser = (u) => {
    if (!window.confirm(`Hapus pengguna "${u.name}"?`)) return
    deleteUser(u.id)
    writeAuditLog?.('pengaturan','delete',u.username,[{field:'user',from:u.name,to:'-'}])
    addToast(`Pengguna ${u.name} dihapus`,'warn')
  }
  const isSA = (u) => u.id==='u1'

  const handleSaveMotor = (data) => {
    if (motorModal.mode==='add') { addMotorType(data); addToast('Tipe motor ditambahkan','success') }
    else { updateMotorType({...motorModal.entry, ...data}); addToast('Tipe motor diperbarui','success') }
    setMotorModal(null)
  }
  const handleDeleteMotor = (m) => {
    if (m.active && motorTypes.filter(x=>x.active).length<=1) { addToast('Minimal 1 tipe motor harus aktif','error'); return }
    if (!window.confirm(`Hapus tipe "${m.name}"?`)) return
    deleteMotorType(m.id); addToast(`Tipe "${m.name}" dihapus`,'warn')
  }

  const handleSaveWorker = (data) => {
    if (workerModal.mode==='add') { addWorker(data); addToast('Pekerja ditambahkan','success') }
    else { updateWorker({...workerModal.entry, ...data}); addToast('Pekerja diperbarui','success') }
    setWorkerModal(null)
  }
  const handleDeleteWorker = (w) => {
    if (w.active && workers.filter(x=>x.active).length<=1) { addToast('Minimal 1 pekerja harus aktif','error'); return }
    if (!window.confirm(`Hapus pekerja "${w.name}"?`)) return
    deleteWorker(w.id); addToast(`Pekerja "${w.name}" dihapus`,'warn')
  }

  const th  = { padding:'12px 20px', textAlign:'left', fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5 }
  const thM = { padding:'12px 16px', textAlign:'left', fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5 }
  const SETTINGS_TABS = [
    { id:'pengguna',     label:'Pengguna',       ownerOnly:true  },
    { id:'gantipw',      label:'Ganti Password', ownerOnly:false },
    { id:'tipemotor',    label:'Tipe Motor',     ownerOnly:false },
    { id:'pekerja',      label:'Pekerja',        ownerOnly:false },
    { id:'logaktivitas', label:'Log Aktivitas',  ownerOnly:false },
  ]
  const visibleTabs = SETTINGS_TABS.filter(t => !t.ownerOnly || isOwner)

  return (
    <div style={{ padding:isMobile?'16px':'40px 24px', background:C.bg, minHeight:'100vh' }}>
      {motorModal  && <MotorTypeModal mode={motorModal.mode}  entry={motorModal.entry}  onSave={handleSaveMotor}  onClose={()=>setMotorModal(null)}  addToast={addToast} />}
      {workerModal && <WorkerModal   mode={workerModal.mode} entry={workerModal.entry} onSave={handleSaveWorker} onClose={()=>setWorkerModal(null)} addToast={addToast} />}
      <div style={{ maxWidth:900, margin:'0 auto' }}>
        <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:isMobile?22:28, color:C.white, marginBottom:isMobile?16:24, letterSpacing:1 }}>PENGATURAN</div>

        {/* Sub-tab nav */}
        <div style={{ display:'flex', gap:4, background:C.surface, border:`1px solid ${C.border}`, borderRadius:10, padding:4, marginBottom:isMobile?20:28, width:isMobile?'100%':'fit-content' }}>
          {visibleTabs.map(t => (
            <button key={t.id} onClick={()=>setTab(t.id)} style={{ background:tab===t.id?C.card:'none', border:'none', color:tab===t.id?C.white:C.muted, cursor:'pointer', padding:'8px 22px', borderRadius:7, fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:14, transition:'all 0.15s', flex:isMobile?1:undefined }}>{t.label}</button>
          ))}
        </div>

        {/* ── Tab: Pengguna (owner only) ── */}
        {tab==='pengguna' && isOwner && (
          <div>
            {/* Add user form */}
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:isMobile?16:24, marginBottom:24 }}>
              <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:18, color:C.white, marginBottom:18 }}>TAMBAH PENGGUNA BARU</div>
              <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'1fr 1fr', gap:14 }}>
                <div>
                  {lbl('Nama Lengkap')}
                  <input value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Nama tampilan" style={inputBase} />
                </div>
                <div>
                  {lbl('Username')}
                  <input value={newUsername} onChange={e=>setNewUsername(e.target.value)} placeholder="Username login" style={inputBase} />
                </div>
                <div>
                  {lbl('Password')}
                  <input type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} placeholder="Password awal" style={inputBase} />
                </div>
              </div>
              <div style={{ marginTop:14 }}>
                {lbl('Akses Tab')}
                <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:6 }}>
                  {PERM_META.map(p => {
                    const on = newPerms.includes(p.key)
                    return (
                      <button key={p.key} onClick={()=>setNewPerms(prev=>on?prev.filter(x=>x!==p.key):[...prev,p.key])}
                        style={{ background:on?p.bg:C.card, border:`1px solid ${on?p.color:C.border}`, color:on?p.color:C.muted, cursor:'pointer', padding:'5px 14px', borderRadius:20, fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:700, transition:'all 0.15s' }}>
                        {p.label}
                      </button>
                    )
                  })}
                </div>
              </div>
              <button onClick={handleAdd} style={{ ...btnRed, marginTop:18, width:'auto', padding:'9px 28px' }}>+ Tambah Pengguna</button>
            </div>

            {/* User list */}
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:18, color:C.white, marginBottom:14 }}>DAFTAR PENGGUNA</div>
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse' }}>
                <thead>
                  <tr style={{ background:C.card }}>
                    {['Nama','Username','Akses Tab','Aksi'].map(h=><th key={h} style={th}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {users.map(u => (
                    <tr key={u.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:'14px 20px', fontFamily:'Barlow, sans-serif', fontSize:14, color:C.white, fontWeight:600 }}>{u.name}</td>
                      <td style={{ padding:'14px 20px', fontFamily:'Courier New,monospace', fontSize:13, color:C.muted }}>{u.username}</td>
                      <td style={{ padding:'14px 20px' }}>
                        {editingId===u.id ? (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                            {PERM_META.map(p => {
                              const on = editPerms.includes(p.key)
                              return (
                                <button key={p.key} onClick={()=>setEditPerms(prev=>on?prev.filter(x=>x!==p.key):[...prev,p.key])}
                                  style={{ background:on?p.bg:C.card, border:`1px solid ${on?p.color:C.border}`, color:on?p.color:C.muted, cursor:'pointer', padding:'3px 12px', borderRadius:20, fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, transition:'all 0.15s' }}>
                                  {p.label}
                                </button>
                              )
                            })}
                          </div>
                        ) : (
                          <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                            {(u.permissions||[]).map(pk => {
                              const p = PERM_META.find(x=>x.key===pk)
                              return p ? <span key={pk} style={{ display:'inline-block', padding:'2px 10px', borderRadius:20, background:p.bg, color:p.color, fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700 }}>{p.label}</span> : null
                            })}
                          </div>
                        )}
                      </td>
                      <td style={{ padding:'14px 20px' }}>
                        {editingId===u.id ? (
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={()=>handleSave(u)} style={{ background:'none', border:`1px solid ${C.green}`, color:C.green, cursor:'pointer', padding:'5px 14px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:13, fontWeight:600 }}>Simpan</button>
                            <button onClick={cancelEdit} style={{ background:'none', border:`1px solid ${C.border}`, color:C.muted, cursor:'pointer', padding:'5px 14px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:13, fontWeight:600 }}>Batal</button>
                          </div>
                        ) : (
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={()=>startEdit(u)} style={{ background:'none', border:`1px solid ${C.blue}`, color:C.blue, cursor:'pointer', padding:'5px 14px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:13, fontWeight:600 }}>Edit</button>
                            {!isSA(u) && <button onClick={()=>handleDeleteUser(u)} style={{ background:'none', border:`1px solid ${C.red}`, color:C.red, cursor:'pointer', padding:'5px 14px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:13, fontWeight:600 }}>Hapus</button>}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── Tab: Ganti Password ── */}
        {tab==='gantipw' && (
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:28, maxWidth:480 }}>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:18, color:C.white, marginBottom:6 }}>GANTI PASSWORD</div>
            <div style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted, marginBottom:22 }}>Login sebagai: {currentUser?.name}</div>
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              <div>
                {lbl('Password Lama')}
                <input type="password" value={oldPw} onChange={e=>{setOldPw(e.target.value);clrPw('old')}} placeholder="Masukkan password saat ini" style={inputBase} />
                {pwErrors.old && <div style={{ color:C.red, fontFamily:'Barlow, sans-serif', fontSize:12, marginTop:4 }}>{pwErrors.old}</div>}
              </div>
              <div>
                {lbl('Password Baru')}
                <input type="password" value={newPw} onChange={e=>{setNewPw(e.target.value);clrPw('new')}} placeholder="Minimal 6 karakter" style={inputBase} />
                {pwErrors.new && <div style={{ color:C.red, fontFamily:'Barlow, sans-serif', fontSize:12, marginTop:4 }}>{pwErrors.new}</div>}
              </div>
              <div>
                {lbl('Konfirmasi Baru')}
                <input type="password" value={confPw} onChange={e=>{setConfPw(e.target.value);clrPw('conf')}} placeholder="Ulangi password baru" style={inputBase} />
                {pwErrors.conf && <div style={{ color:C.red, fontFamily:'Barlow, sans-serif', fontSize:12, marginTop:4 }}>{pwErrors.conf}</div>}
              </div>
              <button onClick={handlePwSubmit} style={btnRed}>SIMPAN PASSWORD</button>
              {pwSuccess && <div style={{ fontFamily:'Barlow, sans-serif', fontSize:14, color:C.green, fontWeight:600 }}>✓ Password berhasil diubah</div>}
            </div>
          </div>
        )}

        {/* ── Tab: Tipe Motor ── */}
        {tab==='tipemotor' && <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:20, color:C.white }}>TIPE MOTOR</div>
            <button onClick={()=>setMotorModal({mode:'add'})} style={{ ...btnRed, width:'auto', padding:'9px 20px', fontSize:14 }}>+ Tambah Tipe</button>
          </div>
          <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead><tr style={{ background:C.card }}>{['Nama','Harga','Status','Aksi'].map(h=><th key={h} style={thM}>{h}</th>)}</tr></thead>
              <tbody>
                {motorTypes.length===0
                  ? <tr><td colSpan={4} style={{ padding:32, textAlign:'center', fontFamily:'Barlow, sans-serif', fontSize:14, color:C.muted }}>Belum ada tipe motor</td></tr>
                  : motorTypes.map(m => (
                      <tr key={m.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                        <td style={{ padding:'14px 16px', fontFamily:'Barlow, sans-serif', fontSize:14, color:C.white, fontWeight:600 }}>{m.name}</td>
                        <td style={{ padding:'14px 16px', fontFamily:'Barlow Condensed, sans-serif', fontSize:16, fontWeight:700, color:C.white }}>{formatRp(m.price)}</td>
                        <td style={{ padding:'14px 16px' }}>
                          <button onClick={()=>toggleMotorType(m.id)} style={{ background:m.active?'#0a1a0a':'#1a1a1a', border:`1px solid ${m.active?C.green:C.border}`, color:m.active?C.green:C.muted, cursor:'pointer', padding:'4px 14px', borderRadius:20, fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:700 }}>
                            {m.active?'Aktif':'Nonaktif'}
                          </button>
                        </td>
                        <td style={{ padding:'14px 16px' }}>
                          <div style={{ display:'flex', gap:8 }}>
                            <button onClick={()=>setMotorModal({mode:'edit',entry:m})} style={{ background:'none', border:`1px solid ${C.blue}`, color:C.blue, cursor:'pointer', padding:'5px 14px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:13, fontWeight:600 }}>Edit</button>
                            <button onClick={()=>handleDeleteMotor(m)} style={{ background:'none', border:`1px solid ${C.red}`, color:C.red, cursor:'pointer', padding:'5px 14px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:13, fontWeight:600 }}>Hapus</button>
                          </div>
                        </td>
                      </tr>
                    ))
                }
              </tbody>
            </table>
          </div>
        </>}

        {/* ── Tab: Pekerja ── */}
        {tab==='pekerja' && <>
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:20, color:C.white }}>DATA PEKERJA</div>
            <button onClick={()=>setWorkerModal({mode:'add'})} style={{ ...btnRed, width:'auto', padding:'9px 20px', fontSize:14 }}>+ Tambah Pekerja</button>
          </div>
          {workers.length===0 ? (
            <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:40, textAlign:'center', color:C.muted, fontFamily:'Barlow, sans-serif', fontSize:14 }}>Belum ada pekerja</div>
          ) : (
            <div style={{ display:'grid', gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(3,1fr)', gap:12 }}>
              {workers.map(w => (
                <div key={w.id} style={{ background:C.card, border:`1px solid ${C.border}`, borderRadius:12, padding:16, display:'flex', flexDirection:'column', alignItems:'center', gap:10 }}>
                  <WorkerAvatar worker={w} size={64} />
                  <div style={{ fontFamily:'Barlow, sans-serif', fontWeight:700, fontSize:15, color:C.white, textAlign:'center' }}>{w.name}</div>
                  <button onClick={()=>toggleWorker(w.id)} style={{ background:w.active?'#0a1a0a':'#1a1a1a', border:`1px solid ${w.active?C.green:C.border}`, color:w.active?C.green:C.muted, cursor:'pointer', padding:'4px 14px', borderRadius:20, fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:700 }}>
                    {w.active?'Aktif':'Nonaktif'}
                  </button>
                  <div style={{ display:'flex', gap:8 }}>
                    <button onClick={()=>setWorkerModal({mode:'edit',entry:w})} style={{ background:'none', border:`1px solid ${C.blue}`, color:C.blue, cursor:'pointer', padding:'5px 14px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:600, minHeight:36 }}>Edit</button>
                    <button onClick={()=>handleDeleteWorker(w)} style={{ background:'none', border:`1px solid ${C.red}`, color:C.red, cursor:'pointer', padding:'5px 14px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:600, minHeight:36 }}>Hapus</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>}

        {/* ── Tab: Log Aktivitas ── */}
        {tab==='logaktivitas' && (() => {
          const PER = 20
          const MOD_BADGE = { riwayat:{bg:'#0a1828',color:C.blue}, finance:{bg:'#0a1a0a',color:C.green}, member:{bg:'#1a1a0a',color:C.amber}, pengaturan:{bg:'#1a0a1a',color:'#a855f7'} }
          const ACT_BADGE = { edit:{bg:'#1a1200',color:C.amber,label:'Edit'}, delete:{bg:'#1a0a0a',color:C.red,label:'Hapus'}, add:{bg:'#0a1a0a',color:C.green,label:'Tambah'} }
          const fmtLT = (iso) => { const d=new Date(iso); const M=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des']; const p=n=>String(n).padStart(2,'0'); return `${p(d.getDate())} ${M[d.getMonth()]} ${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}` }

          const filtered = (auditLog||[])
            .filter(l => l.timestamp.slice(0,10) >= logFrom && l.timestamp.slice(0,10) <= logTo)
            .filter(l => logMod==='all' || l.module===logMod)
            .filter(l => !logSrch || l.userName?.toLowerCase().includes(logSrch.toLowerCase()) || l.target?.toLowerCase().includes(logSrch.toLowerCase()))
          const totalPages = Math.max(1, Math.ceil(filtered.length/PER))
          const paginated  = filtered.slice(logPg*PER, (logPg+1)*PER)

          const exportCSV = () => {
            const H = ['Waktu','User','Modul','Aksi','Target','Perubahan']
            const rows = filtered.map(l => [fmtLT(l.timestamp), l.userName, l.module, l.action, l.target, (l.changes||[]).map(c=>`${c.field}: ${c.from} → ${c.to}`).join('; ')])
            const csv = [H,...rows].map(r=>r.map(v=>`"${String(v??'').replace(/"/g,'""')}"`).join(',')).join('\n')
            const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['﻿'+csv],{type:'text/csv'})); a.download = `audit-log-${todayStr()}.csv`; a.click(); URL.revokeObjectURL(a.href)
          }

          const thL = { padding:'10px 14px', textAlign:'left', fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }
          return (
            <>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18 }}>
                <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:20, color:C.white }}>LOG AKTIVITAS</div>
                <button onClick={exportCSV} style={{ background:'none', border:`1px solid ${C.border}`, color:C.muted, cursor:'pointer', padding:'7px 18px', borderRadius:8, fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:13 }}>Export CSV</button>
              </div>
              <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap', alignItems:'center' }}>
                <input type="date" value={logFrom} onChange={e=>{setLogFrom(e.target.value);setLogPg(0)}} style={{ ...inputBase, width:'auto', padding:'7px 12px', fontSize:13 }} />
                <span style={{ color:C.muted, fontSize:13 }}>s/d</span>
                <input type="date" value={logTo} onChange={e=>{setLogTo(e.target.value);setLogPg(0)}} style={{ ...inputBase, width:'auto', padding:'7px 12px', fontSize:13 }} />
                <select value={logMod} onChange={e=>{setLogMod(e.target.value);setLogPg(0)}} style={{ ...inputBase, width:'auto', padding:'7px 12px', fontSize:13, cursor:'pointer' }}>
                  <option value="all">Semua Modul</option>
                  {['riwayat','finance','member','pengaturan'].map(m=><option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                </select>
                <input value={logSrch} onChange={e=>{setLogSrch(e.target.value);setLogPg(0)}} placeholder="Cari user atau target..." style={{ ...inputBase, maxWidth:200, padding:'7px 12px', fontSize:13 }} />
                <span style={{ marginLeft:'auto', fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted }}>{filtered.length} entri</span>
              </div>
              <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'auto', marginBottom:12 }}>
                <table style={{ width:'100%', borderCollapse:'collapse', minWidth:700 }}>
                  <thead><tr style={{ background:C.card }}>{['Waktu','User','Modul','Aksi','Target','Perubahan'].map(h=><th key={h} style={thL}>{h}</th>)}</tr></thead>
                  <tbody>
                    {paginated.length===0
                      ? <tr><td colSpan={6} style={{ padding:32, textAlign:'center', fontFamily:'Barlow, sans-serif', fontSize:14, color:C.muted }}>Tidak ada log</td></tr>
                      : paginated.map(l => {
                          const mb = MOD_BADGE[l.module]||{bg:C.card,color:C.muted}
                          const ab = ACT_BADGE[l.action] ||{bg:C.card,color:C.muted,label:l.action}
                          return (
                            <tr key={l.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                              <td style={{ padding:'10px 14px', fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, whiteSpace:'nowrap' }}>{fmtLT(l.timestamp)}</td>
                              <td style={{ padding:'10px 14px', fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white }}>{l.userName}</td>
                              <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 9px', borderRadius:4, fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, ...mb }}>{l.module}</span></td>
                              <td style={{ padding:'10px 14px' }}><span style={{ display:'inline-block', padding:'2px 9px', borderRadius:4, fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, ...ab }}>{ab.label}</span></td>
                              <td style={{ padding:'10px 14px', fontFamily:'Courier New,monospace', fontSize:12, color:C.white, whiteSpace:'nowrap' }}>{l.target}</td>
                              <td style={{ padding:'10px 14px' }}>
                                <div style={{ display:'flex', flexWrap:'wrap', gap:4 }}>
                                  {(l.changes||[]).map((c,i) => (
                                    <span key={i} style={{ display:'inline-flex', alignItems:'center', background:'#1e1e1e', border:'1px solid #333', color:C.white, fontSize:11, padding:'2px 7px', borderRadius:4, whiteSpace:'nowrap' }}>
                                      {c.field}: {String(c.from??'')} → {String(c.to??'')}
                                    </span>
                                  ))}
                                </div>
                              </td>
                            </tr>
                          )
                        })
                    }
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:12 }}>
                  <button onClick={()=>setLogPg(p=>Math.max(0,p-1))} disabled={logPg===0} style={{ background:'none', border:`1px solid ${C.border}`, color:logPg===0?C.border:C.muted, cursor:logPg===0?'default':'pointer', padding:'6px 16px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:13 }}>← Prev</button>
                  <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>Hal {logPg+1} / {totalPages}</span>
                  <button onClick={()=>setLogPg(p=>Math.min(totalPages-1,p+1))} disabled={logPg>=totalPages-1} style={{ background:'none', border:`1px solid ${C.border}`, color:logPg>=totalPages-1?C.border:C.muted, cursor:logPg>=totalPages-1?'default':'pointer', padding:'6px 16px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:13 }}>Next →</button>
                </div>
              )}
            </>
          )
        })()}
      </div>
    </div>
  )
}

/* ── Finance ── */
const CASH_CATEGORIES = [
  { id:'sales_revenue',        label:'Sales Revenue',         color:'#22c55e', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="6" cy="19" r="2"/><circle cx="17" cy="19" r="2"/><path d="M17 17h-11v-14h-2"/><path d="M6 5l14 1l-1 7h-13"/>' },
  { id:'other_revenue',        label:'Other Revenue',         color:'#6b7280', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><rect x="7" y="9" width="10" height="10" rx="1"/><circle cx="12" cy="14" r="2"/><path d="M7 9v-1a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v1"/>' },
  { id:'new_funding',          label:'New Funding',           color:'#14b8a6', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>' },
  { id:'space_equipment',      label:'Space & Equipment',     color:'#a855f7', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M3 21l18 0"/><path d="M5 21v-14l8 -4v18"/><path d="M19 21v-10l-6 -4"/><path d="M9 9v.01"/><path d="M9 12v.01"/><path d="M9 15v.01"/><path d="M9 18v.01"/>' },
  { id:'payroll_expenses',     label:'Payroll & Expenses',    color:'#3B9FD4', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><circle cx="9" cy="7" r="4"/><path d="M3 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/><path d="M16 11h6"/><path d="M19 8v6"/>' },
  { id:'inventory_purchase',   label:'Inventory Purchase',    color:'#06b6d4', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>' },
  { id:'operational_services', label:'Operational Services',  color:'#f59e0b', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M10.325 4.317c.426 -1.756 2.924 -1.756 3.35 0a1.724 1.724 0 0 0 2.573 1.066c1.543 -.94 3.31 .826 2.37 2.37a1.724 1.724 0 0 0 1.065 2.572c1.756 .426 1.756 2.924 0 3.35a1.724 1.724 0 0 0 -1.066 2.573c.94 1.543 -.826 3.31 -2.37 2.37a1.724 1.724 0 0 0 -2.572 1.065c-.426 1.756 -2.924 1.756 -3.35 0a1.724 1.724 0 0 0 -2.573 -1.066c-1.543 .94 -3.31 -.826 -2.37 -2.37a1.724 1.724 0 0 0 -1.065 -2.572c-1.756 -.426 -1.756 -2.924 0 -3.35a1.724 1.724 0 0 0 1.066 -2.573c-.94 -1.543 .826 -3.31 2.37 -2.37c1 .608 2.296 .07 2.572 -1.065z"/><circle cx="12" cy="12" r="3"/>' },
  { id:'other_bills',          label:'Other Bills & Charges', color:'#6b7280', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><line x1="9" y1="9" x2="10" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/>' },
  { id:'loans_repayment',      label:'Loans Repayment',       color:'#E8372A', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><rect x="3" y="8" width="18" height="12" rx="2"/><path d="M7 8v-2a2 2 0 0 1 2 -2h6a2 2 0 0 1 2 2v2"/><line x1="9" y1="14" x2="15" y2="14"/>' },
  { id:'assets_purchase',      label:'Assets Purchase',       color:'#ec4899', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M6 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 19m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M3 3h2l2 12a3 3 0 0 0 3 2h7a3 3 0 0 0 3 -2l1 -7h-15.2"/>' },
  { id:'administration',       label:'Administrasi',          color:'#818cf8', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="15" y2="17"/><line x1="9" y1="9" x2="10" y2="9"/>' },
  { id:'transportation',       label:'Transportasi',          color:'#38bdf8', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M7 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M17 17m-2 0a2 2 0 1 0 4 0a2 2 0 1 0 -4 0"/><path d="M5 17h-2v-11a1 1 0 0 1 1 -1h9v12m-4 0h6m4 0h2v-6h-8m0 -5h5l3 5"/>' },
  { id:'renovation',           label:'Renovasi & Bangunan',   color:'#fb923c', svg:'<path stroke="none" d="M0 0h24v24H0z" fill="none"/><path d="M11.414 10l-7.383 7.418a2.091 2.091 0 0 0 0 2.967a2.11 2.11 0 0 0 2.976 0l7.407 -7.385"/><path d="M18.121 15.293l2.586 -2.586a2 2 0 0 0 0 -2.828l-6.586 -6.586a2 2 0 0 0 -2.828 0l-2.586 2.586"/>' },
]
const catById = (id) => CASH_CATEGORIES.find(c => c.id === id)
const CatIcon = ({ c, size=28 }) => (
  <div style={{ width:size, height:size, borderRadius:'50%', background:c.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none">
      <g dangerouslySetInnerHTML={{ __html: c.svg }} />
    </svg>
  </div>
)
function CashLogModal({ mode, type: initType, entry, onSave, onClose, addToast }) {
  const isMobile = useIsMobile()
  const [type,     setType]    = useState(mode === 'add' ? (initType || null) : entry.type)
  const [typeErr,  setTypeErr] = useState(false)
  const [date,     setDate]    = useState(entry?.date        || todayStr())
  const [time,     setTime]    = useState(entry?.time        || timeStr())
  const [amt,      setAmt]     = useState(entry ? String(entry.amount) : '')
  const [desc,     setDesc]    = useState(entry?.description || '')
  const [cat,      setCat]     = useState(entry?.category    || '')
  const [catOpen,  setCatOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    const handler = (e) => { if (!ref.current?.contains(e.target)) setCatOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const accent = type === 'in' ? C.green : type === 'out' ? C.red : C.blue
  const title  = (mode === 'add' ? 'Tambah ' : 'Edit ') + 'Cash Log'
  const selCat = catById(cat)

  const pickType = (t) => { setType(t); setTypeErr(false) }

  const submit = () => {
    if (!type)                        { setTypeErr(true); return }
    const n = Number(amt)
    if (!amt || isNaN(n) || n <= 0) { addToast('Masukkan jumlah yang valid', 'error'); return }
    if (!desc.trim())                { addToast('Masukkan keterangan', 'error');        return }
    if (!cat)                        { addToast('Pilih kategori', 'error');             return }
    onSave({ type, date, time, amount:n, description:desc.trim(), category:cat })
  }

  return (
    <div onClick={e=>e.target===e.currentTarget&&onClose()} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.75)', zIndex:1000, display:'flex', alignItems:isMobile?'flex-end':'center', justifyContent:'center', padding:isMobile?0:24 }}>
      <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:isMobile?'16px 16px 0 0':16, padding:isMobile?'24px 20px 32px':32, width:isMobile?'100%':440, maxHeight:isMobile?'92vh':'auto', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:22 }}>
          <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:22, color:C.white }}>{title}</div>
          <button onClick={onClose} style={{ background:'none', border:'none', color:C.muted, cursor:'pointer', fontSize:22, padding:0, lineHeight:1 }}>×</button>
        </div>
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Type toggle — only shown when adding (edit keeps existing type) */}
          {mode === 'add' && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:0, borderRadius:8, overflow:'hidden', border:`1px solid ${typeErr?C.red:C.border}` }}>
                <button onClick={()=>pickType('in')} style={{ background:type==='in'?C.green:'transparent', border:'none', borderRight:`1px solid ${C.border}`, color:type==='in'?'#fff':C.muted, cursor:'pointer', padding:'14px 0', fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:17, letterSpacing:0.5, transition:'all 0.15s' }}>
                  + Cash In
                </button>
                <button onClick={()=>pickType('out')} style={{ background:type==='out'?C.red:'transparent', border:'none', color:type==='out'?'#fff':C.muted, cursor:'pointer', padding:'14px 0', fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:17, letterSpacing:0.5, transition:'all 0.15s' }}>
                  − Cash Out
                </button>
              </div>
              {typeErr && <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.red, marginTop:6 }}>Pilih tipe: Cash In atau Cash Out</div>}
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
            <div>{lbl('Tanggal')}<input type="date" value={date} onChange={e=>setDate(e.target.value)} style={{ ...inputBase, colorScheme:'dark' }} /></div>
            <div>{lbl('Jam')}<input type="time" value={time} onChange={e=>setTime(e.target.value)} style={{ ...inputBase, colorScheme:'dark' }} /></div>
          </div>
          <div>{lbl('Jumlah (Rp)')}<input type="number" value={amt} onChange={e=>setAmt(e.target.value)} placeholder="0" min="1" style={inputBase} /></div>
          <div>{lbl('Keterangan')}<input value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Masukkan keterangan" style={inputBase} /></div>

          {/* Custom category dropdown */}
          <div>
            {lbl('Kategori')}
            <div ref={ref} style={{ position:'relative' }}>
              <button type="button" onClick={()=>setCatOpen(o=>!o)} style={{
                ...inputBase, display:'flex', alignItems:'center', gap:10,
                cursor:'pointer', textAlign:'left', padding:'10px 14px',
              }}>
                {selCat
                  ? <><CatIcon c={selCat} /><span style={{ flex:1, fontFamily:'Barlow, sans-serif', fontSize:14, color:C.white }}>{selCat.label}</span></>
                  : <span style={{ flex:1, fontFamily:'Barlow, sans-serif', fontSize:14, color:C.muted }}>— Pilih Kategori —</span>
                }
                <span style={{ color:C.muted, flexShrink:0, fontSize:12 }}>{catOpen ? '▲' : '▼'}</span>
              </button>
              {catOpen && (
                <div style={{ position:'absolute', top:'100%', left:0, right:0, background:C.card, border:'1px solid #333', borderRadius:8, zIndex:50, marginTop:4, maxHeight:240, overflowY:'auto', boxShadow:'0 8px 24px rgba(0,0,0,0.5)' }}>
                  {CASH_CATEGORIES.map(c => (
                    <div key={c.id} onClick={()=>{ setCat(c.id); setCatOpen(false) }}
                      style={{ padding:'10px 14px', display:'flex', alignItems:'center', gap:10, cursor:'pointer', background:cat===c.id?'#252525':'transparent' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#252525'}
                      onMouseLeave={e=>e.currentTarget.style.background=cat===c.id?'#252525':'transparent'}
                    >
                      <CatIcon c={c} />
                      <span style={{ fontFamily:'Barlow, sans-serif', fontSize:14, color:cat===c.id?C.white:C.muted, fontWeight:cat===c.id?500:400 }}>{c.label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div style={{ display:'flex', gap:10, marginTop:4 }}>
            <button onClick={onClose} style={btnGhost}>Batal</button>
            <button onClick={submit} style={{ ...btnRed, background:accent }}>Simpan</button>
          </div>
        </div>
      </div>
    </div>
  )
}

function CashLogPage({ cashlog, addCashLog, updateCashLog, deleteCashLog, currentUser, writeAuditLog, addToast }) {
  const isMobile = useIsMobile()
  const [dateFilter, setDateFilter] = useState('today')
  const [typeFilter, setTypeFilter] = useState('all')
  const [search,     setSearch]     = useState('')
  const [modal,      setModal]      = useState(null)

  const cutoff = (days) => { const d=new Date(); d.setDate(d.getDate()-days+1); return d.toISOString().slice(0,10) }
  const inRange = (e) => dateFilter==='today'?e.date===todayStr():dateFilter==='7days'?e.date>=cutoff(7):dateFilter==='30days'?e.date>=cutoff(30):true

  const filtered = cashlog
    .filter(e => inRange(e))
    .filter(e => typeFilter==='all' || e.type===typeFilter)
    .filter(e => !search || e.description.toLowerCase().includes(search.toLowerCase()))
    .sort((a,b) => (b.date+b.time).localeCompare(a.date+a.time))

  const totalIn  = filtered.filter(e=>e.type==='in').reduce((s,e)=>s+e.amount, 0)
  const totalOut = filtered.filter(e=>e.type==='out').reduce((s,e)=>s+e.amount, 0)
  const netCash  = totalIn - totalOut

  const handleSave = (formData) => {
    if (modal.mode === 'add') {
      addCashLog({ ...formData, source:'finance', editable:true, createdBy:currentUser.username })
      writeAuditLog?.('finance', 'add', `[${formData.type}] ${formData.description}`, [{ field:'entry', from:null, to:`${formData.type} Rp${formData.amount} - ${formData.description}` }])
      addToast('Cash log ditambahkan', 'success')
    } else {
      const old = modal.entry
      const changes = []
      if (formData.type        !== old.type)        changes.push({ field:'type',        from:old.type,        to:formData.type })
      if (formData.amount      !== old.amount)      changes.push({ field:'amount',      from:old.amount,      to:formData.amount })
      if (formData.description !== old.description) changes.push({ field:'description', from:old.description, to:formData.description })
      if (formData.category    !== old.category)    changes.push({ field:'category',    from:old.category,    to:formData.category })
      if (changes.length > 0) writeAuditLog?.('finance', 'edit', old.id, changes)
      updateCashLog({ ...old, ...formData })
      addToast('Cash log diperbarui', 'success')
    }
    setModal(null)
  }

  const handleDelete = (e) => {
    if (!e.editable) return
    if (!window.confirm(`Hapus entri "${e.description}"?`)) return
    writeAuditLog?.('finance', 'delete', e.id, [{ field:'status', from:'exists', to:'deleted' }])
    deleteCashLog(e.id)
    addToast('Cash log dihapus', 'warn')
  }

  const today = todayStr()
  const [ty,tm,td] = today.split('-')
  const todayDisplay = `${td}/${tm}/${ty}`

  const thS = { padding:'12px 16px', textAlign:'left', fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, color:C.muted, textTransform:'uppercase', letterSpacing:0.5, whiteSpace:'nowrap' }
  const filterBtn = (active, label, onClick, activeColor) => (
    <button onClick={onClick} style={{ background:active?(activeColor||C.card):'none', border:`1px solid ${active?C.border:C.border}`, color:active?C.white:C.muted, cursor:'pointer', padding:'6px 14px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:13, transition:'all 0.15s' }}>{label}</button>
  )

  return (
    <div style={{ padding:isMobile?'16px':'40px 24px', background:C.bg, minHeight:'100vh' }}>
      {modal && <CashLogModal mode={modal.mode} type={modal.type} entry={modal.entry} onSave={handleSave} onClose={()=>setModal(null)} addToast={addToast} />}
      <div style={{ maxWidth:1100, margin:'0 auto' }}>

        {/* Header */}
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:isMobile?'flex-start':'center', flexDirection:isMobile?'column':'row', gap:isMobile?12:0, marginBottom:isMobile?16:24 }}>
          <div>
            <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:800, fontSize:isMobile?22:28, color:C.white, letterSpacing:1 }}>CASH LOG</div>
            <div style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted, marginTop:2 }}>RINGKASAN — {todayDisplay}</div>
          </div>
          <button onClick={()=>setModal({mode:'add'})} style={{ background:C.blue, border:'none', color:'#fff', cursor:'pointer', padding:'10px 20px', borderRadius:8, fontFamily:'Barlow Condensed, sans-serif', fontWeight:700, fontSize:15, letterSpacing:0.5 }}>+ CashLog</button>
        </div>

        {/* Summary cards */}
        <div style={{ display:'grid', gridTemplateColumns:isMobile?'1fr':'repeat(3,1fr)', gap:isMobile?10:16, marginBottom:isMobile?16:24 }}>
          {[
            { label:'Total Cash In',  value:formatRp(totalIn),  color:C.green },
            { label:'Total Cash Out', value:formatRp(totalOut), color:C.red   },
            { label:'Net Cash',       value:formatRp(netCash),  color:netCash<0?C.red:C.white },
          ].map(s=>(
            <div key={s.label} style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, padding:'22px 24px' }}>
              <div style={{ fontFamily:'Barlow, sans-serif', fontSize:12, color:C.muted, marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</div>
              <div style={{ fontFamily:'Barlow Condensed, sans-serif', fontWeight:900, fontSize:28, color:s.color, lineHeight:1 }}>{s.value}</div>
            </div>
          ))}
        </div>

        {/* Filter bar */}
        <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap', alignItems:isMobile?'stretch':'center', flexDirection:isMobile?'column':'row' }}>
          <div style={{ display:'flex', gap:4, background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:4 }}>
            {[['today','Hari Ini'],['7days','7 Hari'],['30days','30 Hari'],['all','Semua']].map(([v,lb])=>(
              <button key={v} onClick={()=>setDateFilter(v)} style={{ background:dateFilter===v?C.card:'none', border:'none', color:dateFilter===v?C.white:C.muted, cursor:'pointer', padding:'5px 12px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:13 }}>{lb}</button>
            ))}
          </div>
          <div style={{ display:'flex', gap:4, background:C.surface, border:`1px solid ${C.border}`, borderRadius:8, padding:4 }}>
            {[['all','Semua'],['in','Cash In'],['out','Cash Out']].map(([v,lb])=>(
              <button key={v} onClick={()=>setTypeFilter(v)} style={{ background:typeFilter===v?C.card:'none', border:'none', color:typeFilter===v?(v==='in'?C.green:v==='out'?C.red:C.white):C.muted, cursor:'pointer', padding:'5px 12px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontWeight:600, fontSize:13 }}>{lb}</button>
            ))}
          </div>
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari keterangan..." style={{ ...inputBase, maxWidth:220, padding:'7px 14px', fontSize:13 }} />
          <span style={{ marginLeft:'auto', fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{filtered.length} entri</span>
        </div>

        {/* Table */}
        <div style={{ background:C.surface, border:`1px solid ${C.border}`, borderRadius:12, overflow:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:C.card }}>
                {(isMobile?['Tanggal','Keterangan','Kategori','Jumlah','Aksi']:['Tanggal','Waktu','Keterangan','Kategori','Sumber','Jumlah','Aksi']).map(h=><th key={h} style={thS}>{h}</th>)}
              </tr>
            </thead>
            <tbody>
              {filtered.length===0
                ? <tr><td colSpan={7} style={{ padding:32, textAlign:'center', fontFamily:'Barlow, sans-serif', fontSize:14, color:C.muted }}>Tidak ada data untuk filter ini</td></tr>
                : filtered.map(e=>(
                    <tr key={e.id} style={{ borderBottom:`1px solid ${C.border}` }}>
                      <td style={{ padding:'12px 16px', fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white }}>{fmtDate(e.date)}</td>
                      {!isMobile && <td style={{ padding:'12px 16px', fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{e.time}</td>}
                      <td style={{ padding:'12px 16px', fontFamily:'Barlow, sans-serif', fontSize:14, color:C.white, maxWidth:220 }}>
                        <div>{e.description}</div>
                        {e.refTrxId && <div style={{ fontFamily:'Barlow, sans-serif', fontSize:11, color:C.muted, marginTop:2 }}>Ref: {e.refTrxId}</div>}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        {(() => { const c=catById(e.category); return c ? (
                          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <CatIcon c={c} />
                            <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.white }}>{c.label}</span>
                          </div>
                        ) : <span style={{ fontFamily:'Barlow, sans-serif', fontSize:13, color:C.muted }}>{e.category||'—'}</span> })()}
                      </td>
                      {!isMobile && <td style={{ padding:'12px 16px' }}>
                        {e.source==='kasir'
                          ? <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:4, fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, background:C.blue, color:'#0a0a0a' }}>Kasir</span>
                          : <span style={{ display:'inline-block', padding:'2px 10px', borderRadius:4, fontFamily:'Barlow, sans-serif', fontSize:11, fontWeight:700, background:C.card, color:C.muted }}>Finance</span>
                        }
                      </td>}
                      <td style={{ padding:'12px 16px', fontFamily:'Barlow Condensed, sans-serif', fontSize:17, fontWeight:700, color:e.type==='in'?C.green:C.red, whiteSpace:'nowrap' }}>
                        {e.type==='in'?'+':'-'} {formatRp(e.amount)}
                      </td>
                      <td style={{ padding:'12px 16px' }}>
                        {e.editable && (
                          <div style={{ display:'flex', gap:6 }}>
                            <button onClick={()=>setModal({mode:'edit',entry:e})} style={{ background:'none', border:`1px solid ${C.blue}`, color:C.blue, cursor:'pointer', padding:'4px 12px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:600 }}>Edit</button>
                            <button onClick={()=>handleDelete(e)} style={{ background:'none', border:`1px solid ${C.red}`, color:C.red, cursor:'pointer', padding:'4px 12px', borderRadius:6, fontFamily:'Barlow, sans-serif', fontSize:12, fontWeight:600 }}>Hapus</button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>

      </div>
    </div>
  )
}

function FinancePage({ cashlog, addCashLog, updateCashLog, deleteCashLog, currentUser, writeAuditLog, addToast }) {
  return <CashLogPage cashlog={cashlog} addCashLog={addCashLog} updateCashLog={updateCashLog} deleteCashLog={deleteCashLog} currentUser={currentUser} writeAuditLog={writeAuditLog} addToast={addToast} />
}

/* ── App Root ── */
export default function App() {
  const [users,        setUsers]        = useState([])
  const [members,      setMembers]      = useState([])
  const [transactions, setTransactions] = useState([])
  const [cashlog,      setCashlog]      = useState([])
  const [motorTypes,   setMotorTypes]   = useState([])
  const [workers,      setWorkers]      = useState([])
  const [auditLog,     setAuditLog]     = useState([])
  const [dataLoaded,   setDataLoaded]   = useState(false)
  const [currentUser,  setCurrentUser]  = useState(null)
  const [page,         setPage]         = useState('dashboard')
  const { toasts, addToast }            = useToasts()

  useEffect(() => {
    const unsubs = []
    const init = async () => {
      try {
        const [loadedUsers, loadedMotorTypes, loadedWorkers] = await Promise.all([
          getAll('users'),
          getAll('motorTypes'),
          getAll('workers'),
        ])

        if (loadedUsers.length === 0) {
          await Promise.all(INITIAL_USERS.map(u => setItem('users', u.id, u)))
          setUsers(INITIAL_USERS)
        } else {
          setUsers(loadedUsers)
        }

        if (loadedMotorTypes.length === 0) {
          await Promise.all(INITIAL_MOTOR_TYPES.map(m => setItem('motorTypes', m.id, m)))
          setMotorTypes(INITIAL_MOTOR_TYPES)
        } else {
          setMotorTypes(loadedMotorTypes)
        }

        setWorkers(loadedWorkers)

        unsubs.push(listenTo('members',      setMembers))
        unsubs.push(listenTo('transactions', setTransactions))
        unsubs.push(listenTo('cashlog',      setCashlog))

        setDataLoaded(true)
      } catch (err) {
        console.error('Firestore init error', err)
      }
    }
    init()
    return () => unsubs.forEach(u => u())
  }, [])

  const login = (username, password) => {
    const u = users.find(u => u.username === username && u.password === password)
    if (!u) return false
    setCurrentUser(u); setPage(u.permissions[0]); return true
  }
  const logout = () => { setCurrentUser(null); setPage('dashboard') }

  /* members — realtime listener keeps state in sync */
  const addMember    = (m) => setItem('members', m.id, m)
  const updateMember = (m) => setItem('members', m.id, m)

  /* transactions — realtime listener keeps state in sync */
  const addTransaction = (t) => {
    const queueNumber = transactions.filter(tx => tx.date === t.date).length + 1
    const newT = { ...t, queueNumber, status:'menunggu', createdAt:new Date().toISOString(), completedAt:null, rating:null, notes:t.notes||null }
    setItem('transactions', newT.id, newT)
  }
  const completeTransaction = (id, rating) => {
    const t = transactions.find(x => x.id === id)
    if (!t) return
    setItem('transactions', id, { ...t, status:'selesai', completedAt:new Date().toISOString(), rating:rating||null })
  }
  const updateTransaction = (t)  => setItem('transactions', t.id, t)
  const deleteTransaction = (id) => deleteItem('transactions', id)

  /* cashlog — realtime listener keeps state in sync */
  const addCashLog    = (e)  => { const id = nextCashId(cashlog); setItem('cashlog', id, { ...e, id }) }
  const updateCashLog = (e)  => setItem('cashlog', e.id, e)
  const deleteCashLog = (id) => deleteItem('cashlog', id)

  /* users — load-once; manual setState + Firestore write */
  const addUser    = (u)  => { setItem('users', u.id, u);  setUsers(p => [...p, u]) }
  const updateUser = (u)  => { setItem('users', u.id, u);  setUsers(p => p.map(x => x.id===u.id ? u : x)) }
  const deleteUser = (id) => { deleteItem('users', id);    setUsers(p => p.filter(u => u.id !== id)) }

  /* motorTypes — load-once; manual setState + Firestore write */
  const addMotorType    = (m)  => { const id=nextMotorId(motorTypes); const nm={...m,id}; setItem('motorTypes',id,nm); setMotorTypes(p=>[...p,nm]) }
  const updateMotorType = (m)  => { setItem('motorTypes',m.id,m); setMotorTypes(p=>p.map(x=>x.id===m.id?m:x)) }
  const deleteMotorType = (id) => { deleteItem('motorTypes',id);   setMotorTypes(p=>p.filter(m=>m.id!==id)) }
  const toggleMotorType = (id) => { const m=motorTypes.find(x=>x.id===id); if(!m)return; const nm={...m,active:!m.active}; setItem('motorTypes',id,nm); setMotorTypes(p=>p.map(x=>x.id===id?nm:x)) }

  /* workers — load-once; manual setState + Firestore write */
  const addWorker    = (w)  => { const id=nextWorkerId(workers); const nw={...w,id}; setItem('workers',id,nw); setWorkers(p=>[...p,nw]) }
  const updateWorker = (w)  => { setItem('workers',w.id,w); setWorkers(p=>p.map(x=>x.id===w.id?w:x)) }
  const deleteWorker = (id) => { deleteItem('workers',id);   setWorkers(p=>p.filter(w=>w.id!==id)) }
  const toggleWorker = (id) => { const w=workers.find(x=>x.id===id); if(!w)return; const nw={...w,active:!w.active}; setItem('workers',id,nw); setWorkers(p=>p.map(x=>x.id===id?nw:x)) }

  /* auditLog — in-memory only (not persisted to Firestore) */
  const writeAuditLog = (module, action, target, changes) => {
    if (!currentUser) return
    setAuditLog(prev => {
      const entry = { id:nextLogId(prev), timestamp:new Date().toISOString(), userId:currentUser.id, userName:currentUser.name, module, action, target, changes }
      return [entry, ...prev].slice(0, 500)
    })
  }

  useEffect(() => {
    if (currentUser && !currentUser.permissions.includes(page)) setPage(currentUser.permissions[0])
  }, [currentUser, page])

  if (!dataLoaded) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'Barlow Condensed, sans-serif', fontSize:24, fontWeight:700, color:C.muted, letterSpacing:2 }}>
      LOADING...
    </div>
  )
  if (!currentUser) return <><LoginPage onLogin={login} /><Toast toasts={toasts} /></>

  const can = (p) => currentUser.permissions.includes(p)
  return (
    <div style={{ minHeight:'100vh', background:C.bg }}>
      <Toast toasts={toasts} />
      <Nav user={currentUser} page={page} setPage={setPage} logout={logout} />
      {page==='kasir'      && can('kasir')      && <KasirPage     members={members} transactions={transactions} addTransaction={addTransaction} updateMember={updateMember} addMember={addMember} addCashLog={addCashLog} motorTypes={motorTypes} workers={workers} completeTransaction={completeTransaction} user={currentUser} addToast={addToast} />}
      {page==='dashboard'  && can('dashboard')  && <DashboardPage members={members} transactions={transactions} workers={workers} />}
      {page==='member'     && can('member')     && <MemberPage    members={members} transactions={transactions} />}
      {page==='riwayat'    && can('riwayat')    && <RiwayatPage   transactions={transactions} completeTransaction={completeTransaction} updateTransaction={updateTransaction} deleteTransaction={deleteTransaction} motorTypes={motorTypes} currentUser={currentUser} writeAuditLog={writeAuditLog} addToast={addToast} />}
      {page==='finance'    && can('finance')    && <FinancePage   cashlog={cashlog} addCashLog={addCashLog} updateCashLog={updateCashLog} deleteCashLog={deleteCashLog} currentUser={currentUser} writeAuditLog={writeAuditLog} addToast={addToast} />}
      {page==='pengaturan' && can('pengaturan') && <SettingsPage  users={users} addUser={addUser} updateUser={updateUser} deleteUser={deleteUser} motorTypes={motorTypes} addMotorType={addMotorType} updateMotorType={updateMotorType} deleteMotorType={deleteMotorType} toggleMotorType={toggleMotorType} workers={workers} addWorker={addWorker} updateWorker={updateWorker} deleteWorker={deleteWorker} toggleWorker={toggleWorker} auditLog={auditLog} currentUser={currentUser} writeAuditLog={writeAuditLog} addToast={addToast} />}
    </div>
  )
}
