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
            // For production (Railway), use service account from environment variable
            if (process.env.serviceAccount) {
                try {
                    // Parse service account from environment variable
                    const serviceAccount = JSON.parse(process.env.serviceAccount);
                    console.log('Using service account from environment variable');
                    
                    firebaseApp = admin.initializeApp({
                        credential: admin.credential.cert(serviceAccount),
                        projectId: process.env.projectId,
                        storageBucket: process.env.storageBucket,
                        authDomain: process.env.authDomain,
                        messagingSenderId: process.env.messagingSenderId,
                        appId: process.env.appId,
                        measurementId: process.env.measurementId
                    });
                    console.log('Firebase initialized for production with service account');
                } catch (error) {
                    console.error('Error parsing service account from environment:', error);
                    console.log('Falling back to application default credentials');
                    
                    // Fallback to application default credentials
                    firebaseApp = admin.initializeApp({
                        credential: admin.credential.applicationDefault(),
                        projectId: process.env.projectId,
                        storageBucket: process.env.storageBucket,
                        authDomain: process.env.authDomain,
                        messagingSenderId: process.env.messagingSenderId,
                        appId: process.env.appId,
                        measurementId: process.env.measurementId
                    });
                    console.log('Firebase initialized for production with default credentials');
                }
            } else {
                // No service account provided, use application default credentials
                console.log('No service account in environment, using application default credentials');
                firebaseApp = admin.initializeApp({
                    credential: admin.credential.applicationDefault(),
                    projectId: process.env.projectId,
                    storageBucket: process.env.storageBucket,
                    authDomain: process.env.authDomain,
                    messagingSenderId: process.env.messagingSenderId,
                    appId: process.env.appId,
                    measurementId: process.env.measurementId
                });
                console.log('Firebase initialized for production with default credentials');
            }
        } else {
            // For development, use service account key file
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
