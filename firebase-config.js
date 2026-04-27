// firebase-config.js
// ==========================================
// PASO 1: Ve a https://console.firebase.google.com/
// PASO 2: Haz clic en "Agregar proyecto", dale un nombre (ej. "rentlux")
// PASO 3: En tu proyecto, haz clic en el ícono </> (Web app)
// PASO 4: Registra la app, copia los datos que aparecen y pégalos abajo:
// ==========================================

const firebaseConfig = {
    apiKey:            "AIzaSyBXUfUrzYo3aYO22FBkpIEZDifZ4MTGkY0",
    authDomain:        "arriendo-54791.firebaseapp.com",
    projectId:         "arriendo-54791",
    storageBucket:     "arriendo-54791.firebasestorage.app",
    messagingSenderId: "777225815823",
    appId:             "1:777225815823:web:6ce8c8217345bc7523207a",
    measurementId:     "G-R00R28T64B"
};

// ==========================================
// No modifiques nada debajo de esta línea
// ==========================================
const isConfigured = !Object.values(firebaseConfig).some(v => v.startsWith("PEGAR_AQUI"));

if (typeof firebase !== 'undefined' && isConfigured) {
    try {
        firebase.initializeApp(firebaseConfig);
        window.db = firebase.firestore();
        window.FIREBASE_READY = true;
        console.log("✅ Firebase conectado correctamente.");
    } catch(e) {
        console.error("❌ Error al inicializar Firebase:", e);
        window.FIREBASE_READY = false;
    }
} else {
    window.FIREBASE_READY = false;
    console.warn("⚠️ Firebase no configurado. La app funcionará en modo local (sin nube).");
}
