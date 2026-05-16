import { initializeApp } from 'firebase/app'
import { getFirestore, updateDoc, doc } from 'firebase/firestore'

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

const ids = [
  'CSH001','CSH002','CSH003','CSH004','CSH005',
  'CSH006','CSH007','CSH008','CSH009','CSH010',
  'CSH011','CSH012','CSH013','CSH014','CSH015',
]

async function run() {
  for (const id of ids) {
    await updateDoc(doc(db, 'cashlog', id), { category: '' })
    console.log(`✓ ${id}`)
  }
  console.log('Done.')
  process.exit(0)
}

run().catch(err => { console.error(err); process.exit(1) })
