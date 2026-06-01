import { db as firestoreDb } from './firebase'
import {
  collection, getDocs, setDoc, updateDoc,
  deleteDoc, doc, onSnapshot, query, where
} from 'firebase/firestore'

// GET semua data dari collection
export const getAll = async (col) => {
  const snap = await getDocs(collection(firestoreDb, col))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// SET data dengan ID custom (e.g. M001, TRX001)
export const setItem = async (col, id, data) => {
  await setDoc(doc(firestoreDb, col, id), data)
}

// UPDATE sebagian field
export const updateItem = async (col, id, data) => {
  await updateDoc(doc(firestoreDb, col, id), data)
}

// DELETE
export const deleteItem = async (col, id) => {
  await deleteDoc(doc(firestoreDb, col, id))
}

// QUERY with a single where-equals filter
export const queryWhere = async (col, field, value) => {
  const snap = await getDocs(query(collection(firestoreDb, col), where(field, '==', value)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
}

// REALTIME listener — auto update UI saat data berubah
export const listenTo = (col, callback) => {
  return onSnapshot(collection(firestoreDb, col), (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })))
  })
}

// Namespace object — used by Display.jsx and other page-level imports
export const db = { getAll, setItem, updateItem, deleteItem, queryWhere, listenTo }