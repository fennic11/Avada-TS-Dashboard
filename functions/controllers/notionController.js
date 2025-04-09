const notionService = require('../services/notionService');

// Search controller
const search = async (req, res) => {
    try {
        const { query } = req.query;
        const options = req.body.options || {};
        console.log('query', query);
        
        if (!query) {
            return res.status(400).json({
                success: false,
                error: 'Query parameter is required'
            });
        }

        console.log('Searching with query:', query);
        const results = await notionService.searchByText(query, options);

        res.json({
            success: true,
            data: results
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get page content
const getPageContent = async (req, res) => {
    try {
        const { pageId } = req.params;
        console.log('Getting page content for:', pageId);
        const content = await notionService.getPageContent(pageId);
        
        res.json({
            success: true,
            data: content
        });
    } catch (error) {
        console.error('Get page content error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// List databases
const listDatabases = async (req, res) => {
    try {
        console.log('Listing databases');
        const databases = await notionService.listDatabases();
        
        res.json({
            success: true,
            data: databases
        });
    } catch (error) {
        console.error('List databases error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get database content
const getDatabaseContent = async (req, res) => {
    try {
        const { databaseId } = req.params;
        console.log('Getting database content for:', databaseId);
        const content = await notionService.getDatabaseContent(databaseId);
        
        res.json({
            success: true,
            data: content
        });
    } catch (error) {
        console.error('Get database content error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    search,
    getPageContent,
    listDatabases,
    getDatabaseContent
}; 