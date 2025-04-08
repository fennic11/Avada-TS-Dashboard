// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyDR6W-eFyqo1rC8lwcqimAHA09ZLBCynJM",
    authDomain: "avada-ts-dashboard.firebaseapp.com",
    projectId: "avada-ts-dashboard",
    storageBucket: "avada-ts-dashboard.firebasestorage.app",
    messagingSenderId: "1074566071179",
    appId: "1:1074566071179:web:432fdd5857069d6462658e",
    measurementId: "G-E0ZHEBQ66C"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Export để sử dụng ở nơi khác
export { db };
