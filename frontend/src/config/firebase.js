// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCpg6ePltV5gShCAzGsL0vTvfNCtX_7WTM",
  authDomain: "tempcomm-35dff.firebaseapp.com",
  databaseURL: "https://tempcomm-35dff-default-rtdb.firebaseio.com",
  projectId: "tempcomm-35dff",
  storageBucket: "tempcomm-35dff.firebasestorage.app",
  messagingSenderId: "639642243382",
  appId: "1:639642243382:web:eb5318ca6dbb10f4496397"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export default app;