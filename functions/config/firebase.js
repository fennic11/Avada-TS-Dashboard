// config/firebase.js
const admin = require('firebase-admin');

let firebaseApp;

const initializeFirebase = () => {
    try {
        // Check if Firebase is already initialized
        if (admin.apps.length > 0) {
            firebaseApp = admin.apps[0];
            console.log('Firebase already initialized');
            return firebaseApp;
        }

        // Initialize Firebase based on environment
        if (process.env.NODE_ENV === 'production') {
            // For production (Firebase Functions), use default credentials
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(process.env.serviceAccount),
                projectId: process.env.projectId,
                storageBucket: process.env.storageBucket,
                authDomain: process.env.authDomain,
                messagingSenderId: process.env.messagingSenderId,
                appId: process.env.appId,
                measurementId: process.env.measurementId
            });
            console.log('Firebase initialized for production');
        } else {
            // For development, use service account key
            const serviceAccount = require('../serviceAccount.development.json');
            firebaseApp = admin.initializeApp({
                credential: admin.credential.cert(serviceAccount),
                projectId: process.env.projectId,
                storageBucket: process.env.storageBucket,
                authDomain: process.env.authDomain,
                messagingSenderId: process.env.messagingSenderId,
                appId: process.env.appId,
                measurementId: process.env.measurementId
            });
            console.log('Firebase initialized for development');
        }

        return firebaseApp;
    } catch (error) {
        console.error('Error initializing Firebase:', error);
        throw error;
    }
};

const getFirestore = () => {
    if (!firebaseApp) {
        initializeFirebase();
    }
    return admin.firestore();
};

const getAuth = () => {
    if (!firebaseApp) {
        initializeFirebase();
    }
    return admin.auth();
};

const getStorage = () => {
    if (!firebaseApp) {
        initializeFirebase();
    }
    return admin.storage();
};

module.exports = {
    initializeFirebase,
    getFirestore,
    getAuth,
    getStorage,
    admin
};
