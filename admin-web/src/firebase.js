import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase 설정
const firebaseConfig = {
  apiKey: "AIzaSyCr-gPzdjS5_gXpT3eySQUrXJ7ize_JWWU",
  authDomain: "medicalqa-e5313.firebaseapp.com",
  projectId: "medicalqa-e5313",
  storageBucket: "medicalqa-e5313.firebasestorage.app",
  messagingSenderId: "299956056308",
  appId: "1:299956056308:web:5b52c593437947dba9aea1",
  measurementId: "G-DXSREH8M4H"
};

// Firebase 초기화
const app = initializeApp(firebaseConfig);

// Firebase 서비스
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
