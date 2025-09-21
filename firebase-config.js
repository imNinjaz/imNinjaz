// firebase-config.js
// Replace the firebaseConfig values with your project's values if different.

const firebaseConfig = {
  apiKey: "AIzaSyDcT4kDGanFi0umNpgGtQrIPGME65EuYYc",
  authDomain: "rajinder-kumar-realestate.firebaseapp.com",
  projectId: "rajinder-kumar-realestate",
  storageBucket: "rajinder-kumar-realestate.firebasestorage.app",
  messagingSenderId: "826824053345",
  appId: "1:826824053345:web:a637f4e8dec18b0831d020",
  measurementId: "G-0HH1Q2RZ82"
};

firebase.initializeApp(firebaseConfig);

// Expose compat auth + firestore on window for app.js and other pages
window.auth = firebase.auth();
window.db = firebase.firestore();
