// services/firebaseDataService.js
const { getFirestore } = require('../config/firebase');

class FirebaseDataService {
    constructor() {
        this.db = getFirestore();
    }

    // Push data to a specific collection
    async pushData(collectionName, data) {
        try {
            const docRef = await this.db.collection(collectionName).add(data);
            console.log(`Data pushed to ${collectionName} with ID: ${docRef.id}`);
            return docRef.id;
        } catch (error) {
            console.error(`Error pushing data to ${collectionName}:`, error);
            throw error;
        }
    }

    // Push data with custom ID
    async pushDataWithId(collectionName, docId, data) {
        try {
            await this.db.collection(collectionName).doc(docId).set(data);
            console.log(`Data pushed to ${collectionName}/${docId}`);
            return docId;
        } catch (error) {
            console.error(`Error pushing data to ${collectionName}/${docId}:`, error);
            throw error;
        }
    }

    // Update existing data
    async updateData(collectionName, docId, data) {
        try {
            await this.db.collection(collectionName).doc(docId).update(data);
            console.log(`Data updated in ${collectionName}/${docId}`);
            return docId;
        } catch (error) {
            console.error(`Error updating data in ${collectionName}/${docId}:`, error);
            throw error;
        }
    }

    // Get data from collection
    async getData(collectionName, docId = null) {
        try {
            if (docId) {
                const doc = await this.db.collection(collectionName).doc(docId).get();
                if (doc.exists) {
                    return { id: doc.id, ...doc.data() };
                }
                return null;
            } else {
                const snapshot = await this.db.collection(collectionName).get();
                return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            }
        } catch (error) {
            console.error(`Error getting data from ${collectionName}:`, error);
            throw error;
        }
    }

    // Delete data
    async deleteData(collectionName, docId) {
        try {
            await this.db.collection(collectionName).doc(docId).delete();
            console.log(`Data deleted from ${collectionName}/${docId}`);
            return true;
        } catch (error) {
            console.error(`Error deleting data from ${collectionName}/${docId}:`, error);
            throw error;
        }
    }

    // Batch operations for multiple documents
    async batchPush(collectionName, dataArray) {
        try {
            const batch = this.db.batch();
            const results = [];

            dataArray.forEach((data, index) => {
                const docRef = this.db.collection(collectionName).doc();
                batch.set(docRef, data);
                results.push({ id: docRef.id, index });
            });

            await batch.commit();
            console.log(`Batch pushed ${dataArray.length} documents to ${collectionName}`);
            return results;
        } catch (error) {
            console.error(`Error batch pushing to ${collectionName}:`, error);
            throw error;
        }
    }

    // Query data with filters
    async queryData(collectionName, filters = []) {
        try {
            let query = this.db.collection(collectionName);
            
            filters.forEach(filter => {
                query = query.where(filter.field, filter.operator, filter.value);
            });

            const snapshot = await query.get();
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error(`Error querying data from ${collectionName}:`, error);
            throw error;
        }
    }
}

module.exports = new FirebaseDataService();
