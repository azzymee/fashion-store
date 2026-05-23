import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDiBX_zFxs54yONV_-fh1Lf-xUL8genoZI",
  authDomain: "techfit-7262a.firebaseapp.com",
  projectId: "techfit-7262a",
  storageBucket: "techfit-7262a.firebasestorage.app",
  messagingSenderId: "72628124702",
  appId: "1:72628124702:web:a149ad5ee7d5f1a96c420f"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;