import { initializeApp } from 'firebase/app'
import { getFirestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: "AIzaSyBvzODQklLcENFAhb2wuqg0KPvubnrvS8c",
  authDomain: "red-truck-455704-d2.firebaseapp.com",
  projectId: "red-truck-455704-d2",
  storageBucket: "red-truck-455704-d2.firebasestorage.app",
  messagingSenderId: "885334453677",
  appId: "1:885334453677:web:c842eb474b1eb841568524"
}

const app = initializeApp(firebaseConfig)
export const db = getFirestore(app)