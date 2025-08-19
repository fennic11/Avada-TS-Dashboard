// controllers/firebaseController.js
const firebaseDataService = require('../services/firebaseDataService');

// Push data to Firebase
const pushData = async (req, res) => {
    try {
        const { collectionName, data } = req.body;
        
        if (!collectionName || !data) {
            return res.status(400).json({
                success: false,
                message: 'Collection name and data are required'
            });
        }

        const docId = await firebaseDataService.pushData(collectionName, data);
        
        res.status(201).json({
            success: true,
            message: 'Data pushed successfully',
            data: { docId, collectionName }
        });
    } catch (error) {
        console.error('Error in pushData:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to push data',
            error: error.message
        });
    }
};

// Push data with custom ID
const pushDataWithId = async (req, res) => {
    try {
        const { collectionName, docId, data } = req.body;
        
        if (!collectionName || !docId || !data) {
            return res.status(400).json({
                success: false,
                message: 'Collection name, document ID, and data are required'
            });
        }

        await firebaseDataService.pushDataWithId(collectionName, docId, data);
        
        res.status(201).json({
            success: true,
            message: 'Data pushed successfully with custom ID',
            data: { docId, collectionName }
        });
    } catch (error) {
        console.error('Error in pushDataWithId:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to push data with custom ID',
            error: error.message
        });
    }
};

// Update data
const updateData = async (req, res) => {
    try {
        const { collectionName, docId, data } = req.body;
        
        if (!collectionName || !docId || !data) {
            return res.status(400).json({
                success: false,
                message: 'Collection name, document ID, and data are required'
            });
        }

        await firebaseDataService.updateData(collectionName, docId, data);
        
        res.status(200).json({
            success: true,
            message: 'Data updated successfully',
            data: { docId, collectionName }
        });
    } catch (error) {
        console.error('Error in updateData:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update data',
            error: error.message
        });
    }
};

// Get data
const getData = async (req, res) => {
    try {
        const { collectionName, docId } = req.params;
        
        if (!collectionName) {
            return res.status(400).json({
                success: false,
                message: 'Collection name is required'
            });
        }

        const data = await firebaseDataService.getData(collectionName, docId);
        
        res.status(200).json({
            success: true,
            message: 'Data retrieved successfully',
            data
        });
    } catch (error) {
        console.error('Error in getData:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get data',
            error: error.message
        });
    }
};

// Delete data
const deleteData = async (req, res) => {
    try {
        const { collectionName, docId } = req.params;
        
        if (!collectionName || !docId) {
            return res.status(400).json({
                success: false,
                message: 'Collection name and document ID are required'
            });
        }

        await firebaseDataService.deleteData(collectionName, docId);
        
        res.status(200).json({
            success: true,
            message: 'Data deleted successfully',
            data: { docId, collectionName }
        });
    } catch (error) {
        console.error('Error in deleteData:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete data',
            error: error.message
        });
    }
};

// Batch push data
const batchPush = async (req, res) => {
    try {
        const { collectionName, dataArray } = req.body;
        
        if (!collectionName || !dataArray || !Array.isArray(dataArray)) {
            return res.status(400).json({
                success: false,
                message: 'Collection name and data array are required'
            });
        }

        const results = await firebaseDataService.batchPush(collectionName, dataArray);
        
        res.status(201).json({
            success: true,
            message: 'Batch data pushed successfully',
            data: { results, collectionName, count: dataArray.length }
        });
    } catch (error) {
        console.error('Error in batchPush:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to batch push data',
            error: error.message
        });
    }
};

// Query data with filters
const queryData = async (req, res) => {
    try {
        const { collectionName, filters } = req.body;
        
        if (!collectionName) {
            return res.status(400).json({
                success: false,
                message: 'Collection name is required'
            });
        }

        const data = await firebaseDataService.queryData(collectionName, filters || []);
        
        res.status(200).json({
            success: true,
            message: 'Data queried successfully',
            data
        });
    } catch (error) {
        console.error('Error in queryData:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to query data',
            error: error.message
        });
    }
};

module.exports = {
    pushData,
    pushDataWithId,
    updateData,
    getData,
    deleteData,
    batchPush,
    queryData
};
