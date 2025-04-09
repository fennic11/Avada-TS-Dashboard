import { API_URL} from './apiConfig';


const NOTION_API_URL = 'https://api.notion.com/v1';
const NOTION_VERSION = '2022-06-28';

// Get Notion API key from environment variables
const NOTION_KEY = "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";

// Helper function to check API key
const checkApiKey = () => {
    if (!NOTION_KEY) {
        throw new Error('Notion API key is not configured. Please add REACT_APP_NOTION_KEY to your environment variables.');
    }
};

// Helper function to handle API responses
const handleResponse = async (response) => {
    const contentType = response.headers.get('content-type');
    
    if (!response.ok) {
        if (contentType && contentType.includes('application/json')) {
            const error = await response.json();
            throw new Error(error.message || `API Error: ${response.status} ${response.statusText}`);
        }
        throw new Error(`Network Error: ${response.status} ${response.statusText}`);
    }

    if (contentType && contentType.includes('application/json')) {
        return response.json();
    }

    throw new Error(`Unexpected content type: ${contentType}`);
};

// Search across all pages and databases
export const searchNotion = async (query, options = {}) => {
    try {
        const {
            sortField = 'last_edited_time',
            sortDirection = 'descending',
            filter = {},
            startCursor = undefined,
            pageSize = 10
        } = options;

        console.log('Searching Notion with query:', query);

        const response = await fetch(`${NOTION_API_URL}/search`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_KEY}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                query,
                sort: {
                    direction: sortDirection,
                    timestamp: sortField
                },
                filter,
                start_cursor: startCursor,
                page_size: pageSize
            })
        });

        const data = await handleResponse(response);
        console.log('Search results:', data);
        
        return {
            results: data.results,
            hasMore: data.has_more,
            nextCursor: data.next_cursor
        };
    } catch (error) {
        console.error('Error searching Notion:', error);
        throw error;
    }
};

// Search in a specific database
export const searchDatabase = async (databaseId, query = '', options = {}) => {
    try {
        const {
            sortField = 'last_edited_time',
            sortDirection = 'descending',
            filter = {},
            startCursor = undefined,
            pageSize = 10
        } = options;

        console.log(`Searching database ${databaseId} with query:`, query);

        const response = await fetch(`${NOTION_API_URL}/databases/${databaseId}/query`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${NOTION_KEY}`,
                'Notion-Version': NOTION_VERSION,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                page_size: pageSize,
                sorts: [{
                    property: sortField,
                    direction: sortDirection
                }],
                filter: query ? {
                    ...filter,
                    property: 'title',
                    text: {
                        contains: query
                    }
                } : filter,
                start_cursor: startCursor
            })
        });

        const data = await handleResponse(response);
        console.log('Database search results:', data);

        return {
            results: data.results,
            hasMore: data.has_more,
            nextCursor: data.next_cursor
        };
    } catch (error) {
        console.error('Error searching database:', error);
        throw error;
    }
};

// Get page content
export const getPageContent = async (pageId) => {
    try {
        console.log('Fetching page content for:', pageId);

        const response = await fetch(`${NOTION_API_URL}/pages/${pageId}`, {
            headers: {
                'Authorization': `Bearer ${NOTION_KEY}`,
                'Notion-Version': NOTION_VERSION,
            }
        });

        const data = await handleResponse(response);
        console.log('Page content:', data);
        
        return data;
    } catch (error) {
        console.error('Error fetching page content:', error);
        throw error;
    }
};

// Get block children (page content blocks)
export const getBlockChildren = async (blockId, options = {}) => {
    try {
        const {
            startCursor = undefined,
            pageSize = 100
        } = options;

        console.log('Fetching block children for:', blockId);

        const response = await fetch(
            `${NOTION_API_URL}/blocks/${blockId}/children?page_size=${pageSize}${startCursor ? `&start_cursor=${startCursor}` : ''}`,
            {
                headers: {
                    'Authorization': `Bearer ${NOTION_KEY}`,
                    'Notion-Version': NOTION_VERSION,
                }
            }
        );

        const data = await handleResponse(response);
        console.log('Block children:', data);

        return {
            results: data.results,
            hasMore: data.has_more,
            nextCursor: data.next_cursor
        };
    } catch (error) {
        console.error('Error fetching block children:', error);
        throw error;
    }
};

// Search articles by keyword
export const searchArticles = async (keyword, options = {}) => {
    try {
        console.log('Searching articles with keyword:', keyword);

        // Build query parameters for GET request
        const queryParams = new URLSearchParams({
            query: keyword,
            ...options
        });

        // Try GET request first
        const response = await fetch(`${API_URL}/notion/search?${queryParams}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json',
            }
        });
        console.log('response', response);
        

        // If GET fails, try POST
        if (!response.ok) {
            const response = await fetch('/api/notion/search', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    query: keyword,
                    options: {
                        sort_field: 'last_edited_time',
                        sort_direction: 'descending',
                        page_size: 20,
                        ...options
                    }
                })
            });
        }

        const data = await handleResponse(response);
        
        if (!data.success || !data.data) {
            console.warn('Unexpected API response format:', data);
            return { articles: [], hasMore: false };
        }
        
        // Transform results to a simpler format
        const articles = data.data.results.map(page => ({
            id: page.id,
            title: page.title,
            description: page.description,
            url: page.url,
            lastEdited: page.lastEdited,
            created: page.created,
            cover: page.cover,
            icon: page.icon,
            properties: page.properties
        }));

        console.log('Found articles:', articles.length);

        return {
            articles,
            hasMore: data.data.hasMore || false,
            nextCursor: data.data.nextCursor
        };
    } catch (error) {
        console.error('Error searching articles:', error);
        throw new Error(`Failed to search articles: ${error.message}`);
    }
};

// Get full article content
export const getArticleContent = async (pageId) => {
    try {
        console.log('Fetching article content for:', pageId);

        const response = await fetch(`/api/notion/pages/${pageId}`, {
            headers: {
                'Content-Type': 'application/json',
            }
        });

        const data = await handleResponse(response);
        
        if (!data.success || !data.data) {
            throw new Error('Invalid response format');
        }

        return data.data;
    } catch (error) {
        console.error('Error getting article content:', error);
        throw new Error(`Failed to get article content: ${error.message}`);
    }
};
