import { initializeApp } from 'firebase/app'
import { getFirestore, collection, getDocs, setDoc, doc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBvzODQklLcENFAhb2wuqg0KPvubnrvS8c",
  authDomain: "red-truck-455704-d2.firebaseapp.com",
  projectId: "red-truck-455704-d2",
  storageBucket: "red-truck-455704-d2.firebasestorage.app",
  messagingSenderId: "885334453677",
  appId: "1:885334453677:web:c842eb474b1eb841568524"
}

const app = initializeApp(firebaseConfig)
const db  = getFirestore(app)

// Category mapping: user's Indonesian labels → CASH_CATEGORIES IDs
// Administrasi        → administration   (new category added to App.jsx)
// Perlengkapan Op.    → operational_services
// Sewa & Utilitas     → space_equipment
// Peralatan & Mesin   → assets_purchase
// Transportasi        → transportation   (new category added to App.jsx)
// Renovasi & Bangunan → renovation       (new category added to App.jsx)

const RAW = [
  { date:'2026-06-03', description:'Ngeprint 8 Lembar',       amount:8000,      category:'administration'      },
  { date:'2026-06-03', description:'Lem',                     amount:5000,      category:'operational_services'},
  { date:'2026-06-03', description:'Kwitansi',                amount:5000,      category:'administration'      },
  { date:'2026-06-03', description:'Materai (3x Rp12.000)',   amount:36000,     category:'administration'      },
  { date:'2026-06-03', description:'Map Hijau',               amount:2000,      category:'administration'      },
  { date:'2026-06-03', description:'DP Sewa Tempat',          amount:10006500,  category:'space_equipment'     },
  { date:'2026-06-06', description:'Peralatan Cuci Steam',    amount:9475000,   category:'assets_purchase'     },
  { date:'2026-06-06', description:'Ongkos Tol',              amount:150000,    category:'transportation'      },
  { date:'2026-06-06', description:'Grab Car',                amount:200000,    category:'transportation'      },
  { date:'2026-06-07', description:'Bahan Bangunan',          amount:3890000,   category:'renovation'          },
  { date:'2026-06-07', description:'Kuli (10 Hari Borongan)', amount:8000000,   category:'renovation'          },
  { date:'2026-06-07', description:'Ember',                   amount:70000,     category:'operational_services'},
  { date:'2026-06-07', description:'Pilok',                   amount:30000,     category:'operational_services'},
  { date:'2026-06-07', description:'Plastik',                 amount:15000,     category:'operational_services'},
  { date:'2026-06-07', description:'Sapu & Pengky',           amount:50000,     category:'operational_services'},
]

async function seed() {
  console.log('Connecting to Firestore...')
  const snap = await getDocs(collection(db, 'cashlog'))
  const existing = snap.docs.map(d => ({ id: d.id, ...d.data() }))
  console.log(`Existing cashlog entries: ${existing.length}`)

  // Compute next ID counter from highest existing CSH number
  let counter = existing.reduce((m, x) => Math.max(m, parseInt(x.id?.slice(3)) || 0), 0)
  console.log(`Last CSH ID number: ${counter}`)

  const toWrite = RAW.map(raw => {
    counter++
    const id = 'CSH' + String(counter).padStart(3, '0')
    return {
      id,
      type: 'out',
      amount: raw.amount,
      description: raw.description,
      category: raw.category,
      date: raw.date,
      time: '07:00',
      source: 'manual',
      refTrxId: null,
      createdBy: 'admin',
      editable: true,
    }
  })

  console.log('\nEntries to write:')
  toWrite.forEach(e =>
    console.log(`  ${e.id} | ${e.date} | ${e.description.padEnd(28)} | Rp ${e.amount.toLocaleString('id-ID')} | ${e.category}`)
  )
  const total = toWrite.reduce((s, e) => s + e.amount, 0)
  console.log(`  ${''.padEnd(60, '─')}`)
  console.log(`  TOTAL                                               Rp ${total.toLocaleString('id-ID')}`)

  console.log('\nWriting to Firestore...')
  for (const entry of toWrite) {
    const { id, ...data } = entry
    await setDoc(doc(db, 'cashlog', id), data)
    console.log(`  ✓ ${id}`)
  }

  console.log('\nAll 15 entries seeded successfully.')
  process.exit(0)
}

seed().catch(err => { console.error('Seed failed:', err); process.exit(1) })
