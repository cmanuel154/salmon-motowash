import { db } from './firebase'
import {
  collection, getDocs, setDoc, updateDoc,
  deleteDoc, doc, onSnapshot
} from 'firebase/firestore'

// GET semua data dari collection
export const getAll = async (col) => {
  const snap = await getDocs(collection(db, col))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// SET data dengan ID custom (e.g. M001, TRX001)
export const setItem = async (col, id, data) => {
  await setDoc(doc(db, col, id), data)
}

// UPDATE sebagian field
export const updateItem = async (col, id, data) => {
  await updateDoc(doc(db, col, id), data)
}

// DELETE
export const deleteItem = async (col, id) => {
  await deleteDoc(doc(db, col, id))
}

// REALTIME listener — auto update UI saat data berubah
export const listenTo = (col, callback) => {
  return onSnapshot(collection(db, col), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}