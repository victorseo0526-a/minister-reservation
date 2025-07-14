import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBOmX7i2e8gB7Ucx-wsoZfTJaaVuJzDTLo",
  authDomain: "minister-reservation.firebaseapp.com",
  projectId: "minister-reservation",
  storageBucket: "minister-reservation.firebasestorage.app",
  messagingSenderId: "138068014760",
  appId: "1:138068014760:web:b6e320015ae6246788349d",
  measurementId: "G-KK96C8H8SL"
};

// Next.js hot reload 대응 (중복 초기화 방지)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const db = getFirestore(app);

export { db };
