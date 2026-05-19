import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyC71rlO_jsy9NYFF9AvJ52Xl69xUmzWOno",
  authDomain: "sky-zone-pos.firebaseapp.com",
  projectId: "sky-zone-pos",
  storageBucket: "sky-zone-pos.firebasestorage.app",
  messagingSenderId: "403866081878",
  appId: "1:403866081878:web:af09faaf745a2d5e6bf9f7"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
