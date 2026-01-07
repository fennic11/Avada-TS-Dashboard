const { Client } = require('@notionhq/client');

const notion = new Client({
    auth: ""
});

// Tìm kiếm tất cả
const searchAll = async (query, options = {}) => {
    try {
        const response = await notion.search({
            query,
            filter: options.filter,
            sort: {
                direction: options.sort_direction || 'descending',
                timestamp: options.sort_field || 'last_edited_time'
            },
            page_size: options.page_size || 20,
            start_cursor: options.start_cursor
        });

        return {
            results: response.results.map(formatSearchResult),
            hasMore: response.has_more,
            nextCursor: response.next_cursor
        };
    } catch (error) {
        console.error('Error searching all:', error);
        throw error;
    }
};

// Tìm kiếm bài viết
const searchArticles = async (query, options = {}) => {
    try {
        const response = await notion.search({
            query,
            filter: {
                property: 'object',
                value: 'page'
            },
            sort: {
                direction: options.sort_direction || 'descending',
                timestamp: 'last_edited_time'
            },
            page_size: 20
        });

        const articles = response.results.map(page => ({
            id: page.id,
            title: extractTitle(page),
            url: page.url,
            lastEdited: page.last_edited_time,
            created: page.created_time,
            preview: extractPreview(page)
        }));

        return {
            articles,
            hasMore: response.has_more,
            nextCursor: response.next_cursor
        };
    } catch (error) {
        console.error('Error searching articles:', error);
        throw error;
    }
};

// Tìm kiếm tài liệu
const searchDocs = async (query, options = {}) => {
    try {
        const response = await notion.search({
            query,
            filter: {
                property: 'object',
                value: 'page'
            },
            sort: {
                direction: options.sort_direction || 'descending',
                timestamp: 'last_edited_time'
            },
            page_size: 20
        });

        const docs = response.results.map(page => ({
            id: page.id,
            title: extractTitle(page),
            url: page.url,
            lastEdited: page.last_edited_time,
            created: page.created_time,
            preview: extractPreview(page)
        }));

        return {
            docs,
            hasMore: response.has_more,
            nextCursor: response.next_cursor
        };
    } catch (error) {
        console.error('Error searching docs:', error);
        throw error;
    }
};

// Tìm kiếm trong database
const searchDatabase = async (databaseId, query = '', options = {}) => {
    try {
        // Kiểm tra databaseId
        if (!databaseId) {
            throw new Error('Database ID is required');
        }

        // Tạo filter dựa trên query
        const filter = query ? {
            or: [
                {
                    property: 'Name',
                    title: {
                        contains: query
                    }
                },
                {
                    property: 'Title',
                    title: {
                        contains: query
                    }
                },
                {
                    property: 'Description',
                    rich_text: {
                        contains: query
                    }
                }
            ]
        } : undefined;

        // Tạo sort options
        const sorts = options.sort_field ? [{
            property: options.sort_field,
            direction: options.sort_direction || 'descending'
        }] : undefined;

        // Thực hiện query database
        const response = await notion.databases.query({
            database_id: databaseId,
            filter,
            sorts,
            page_size: options.page_size || 100,
            start_cursor: options.start_cursor
        });

        // Format kết quả
        const results = response.results.map(page => ({
            id: page.id,
            title: extractTitle(page),
            description: extractPreview(page),
            url: page.url,
            lastEdited: page.last_edited_time,
            created: page.created_time,
            properties: formatProperties(page.properties),
            cover: page.cover?.type === 'external' ? page.cover.external.url : 
                   page.cover?.type === 'file' ? page.cover.file.url : null,
            icon: page.icon?.type === 'emoji' ? page.icon.emoji : 
                  page.icon?.type === 'external' ? page.icon.external.url : 
                  page.icon?.type === 'file' ? page.icon.file.url : null
        }));

        return {
            results,
            hasMore: response.has_more,
            nextCursor: response.next_cursor
        };
    } catch (error) {
        console.error('Error searching database:', error);
        throw error;
    }
};

// Lấy nội dung page
const getPageContent = async (pageId) => {
    try {
        const [page, blocks] = await Promise.all([
            notion.pages.retrieve({ page_id: pageId }),
            notion.blocks.children.list({ block_id: pageId, page_size: 100 })
        ]);

        const content = blocks.results.map(formatBlock).filter(Boolean).join('\n\n');

        return {
            id: page.id,
            title: extractTitle(page),
            content,
            url: page.url,
            lastEdited: page.last_edited_time,
            created: page.created_time,
            properties: page.properties
        };
    } catch (error) {
        console.error('Error getting page content:', error);
        throw error;
    }
};

// Lấy nội dung block
const getBlockChildren = async (blockId, options = {}) => {
    try {
        const response = await notion.blocks.children.list({
            block_id: blockId,
            page_size: options.page_size || 100,
            start_cursor: options.start_cursor
        });

        return {
            blocks: response.results.map(formatBlock),
            hasMore: response.has_more,
            nextCursor: response.next_cursor
        };
    } catch (error) {
        console.error('Error getting block children:', error);
        throw error;
    }
};

// Lấy nội dung database
const getDatabaseContent = async (databaseId) => {
    try {
        const database = await notion.databases.retrieve({
            database_id: databaseId
        });

        return {
            id: database.id,
            title: extractTitle(database),
            description: database.description,
            properties: database.properties,
            lastEdited: database.last_edited_time,
            created: database.created_time,
            url: database.url
        };
    } catch (error) {
        console.error('Error getting database content:', error);
        throw error;
    }
};

// Lấy danh sách databases
const listDatabases = async () => {
    try {
        const response = await notion.search({
            filter: {
                property: 'object',
                value: 'database'
            }
        });

        return {
            databases: response.results.map(db => ({
                id: db.id,
                title: extractTitle(db),
                description: db.description,
                lastEdited: db.last_edited_time,
                created: db.created_time,
                url: db.url
            })),
            hasMore: response.has_more,
            nextCursor: response.next_cursor
        };
    } catch (error) {
        console.error('Error listing databases:', error);
        throw error;
    }
};

// Lấy nội dung bài viết
const getArticleContent = async (pageId) => {
    try {
        // Lấy thông tin page
        const page = await notion.pages.retrieve({ page_id: pageId });
        
        // Lấy các block con của page
        const blocks = await notion.blocks.children.list({
            block_id: pageId,
            page_size: 100
        });

        // Format nội dung từ các block
        const content = blocks.results.map(block => {
            if (!block || !block.type) return '';

            switch (block.type) {
                case 'paragraph':
                    return block.paragraph?.rich_text?.map(text => text.plain_text).join('') || '';
                case 'heading_1':
                    return '# ' + (block.heading_1?.rich_text?.map(text => text.plain_text).join('') || '');
                case 'heading_2':
                    return '## ' + (block.heading_2?.rich_text?.map(text => text.plain_text).join('') || '');
                case 'heading_3':
                    return '### ' + (block.heading_3?.rich_text?.map(text => text.plain_text).join('') || '');
                case 'bulleted_list_item':
                    return '• ' + (block.bulleted_list_item?.rich_text?.map(text => text.plain_text).join('') || '');
                case 'numbered_list_item':
                    return '1. ' + (block.numbered_list_item?.rich_text?.map(text => text.plain_text).join('') || '');
                case 'to_do':
                    return `[${block.to_do?.checked ? 'x' : ' '}] ` + (block.to_do?.rich_text?.map(text => text.plain_text).join('') || '');
                case 'toggle':
                    return '▸ ' + (block.toggle?.rich_text?.map(text => text.plain_text).join('') || '');
                case 'code':
                    return '```' + (block.code?.language || '') + '\n' + 
                           (block.code?.rich_text?.map(text => text.plain_text).join('') || '') + 
                           '\n```';
                case 'quote':
                    return '> ' + (block.quote?.rich_text?.map(text => text.plain_text).join('') || '');
                case 'image':
                    return `![${block.image?.caption?.[0]?.plain_text || 'Image'}](${block.image?.file?.url || block.image?.external?.url || ''})`;
                case 'divider':
                    return '---';
                case 'callout':
                    return `> ${block.callout?.icon?.emoji || '💡'} ` + 
                           (block.callout?.rich_text?.map(text => text.plain_text).join('') || '');
                case 'table':
                    return formatTable(block);
                default:
                    return '';
            }
        }).filter(text => text.trim()).join('\n\n');

        // Trích xuất metadata
        const metadata = {
            title: extractTitle(page),
            description: extractPreview(page),
            cover: page.cover?.type === 'external' ? page.cover.external.url : 
                   page.cover?.type === 'file' ? page.cover.file.url : null,
            icon: page.icon?.type === 'emoji' ? page.icon.emoji : 
                  page.icon?.type === 'external' ? page.icon.external.url : 
                  page.icon?.type === 'file' ? page.icon.file.url : null,
            lastEdited: page.last_edited_time,
            created: page.created_time,
            url: page.url
        };

        return {
            id: page.id,
            ...metadata,
            content: content || 'No content available',
            properties: page.properties
        };
    } catch (error) {
        console.error('Error getting article content:', error);
        throw error;
    }
};

// Helper function to format table content
const formatTable = (block) => {
    if (!block.table) return '';
    
    const rows = block.table.children?.map(row => {
        return row.table_row?.cells?.map(cell => {
            return cell.map(text => text.plain_text).join(' ');
        }).join(' | ');
    }) || [];

    if (rows.length === 0) return '';
    
    // Add header separator
    const separator = rows[0].split(' | ').map(() => '---').join(' | ');
    rows.splice(1, 0, separator);
    
    return rows.join('\n');
};

// Helper functions
const extractTitle = (obj) => {
    if (!obj) return 'Untitled';
    
    // For pages and databases
    if (obj.properties?.Name?.title) {
        return obj.properties.Name.title[0]?.plain_text || 'Untitled';
    }
    if (obj.properties?.Title?.title) {
        return obj.properties.Title.title[0]?.plain_text || 'Untitled';
    }
    
    // For blocks
    if (obj.type === 'heading_1') {
        return obj.heading_1?.rich_text[0]?.plain_text || 'Untitled';
    }
    if (obj.type === 'heading_2') {
        return obj.heading_2?.rich_text[0]?.plain_text || 'Untitled';
    }
    if (obj.type === 'heading_3') {
        return obj.heading_3?.rich_text[0]?.plain_text || 'Untitled';
    }
    
    return 'Untitled';
};

const extractPreview = (page) => {
    if (!page || !page.properties) return '';
    
    return page.properties?.Description?.rich_text?.[0]?.plain_text || 
           page.properties?.Content?.rich_text?.[0]?.plain_text || 
           'No preview available';
};

const formatBlock = (block) => {
    if (!block || !block.type) return '';

    switch (block.type) {
        case 'paragraph':
            return block.paragraph?.rich_text?.map(text => text.plain_text).join('') || '';
        case 'heading_1':
            return '# ' + (block.heading_1?.rich_text?.map(text => text.plain_text).join('') || '');
        case 'heading_2':
            return '## ' + (block.heading_2?.rich_text?.map(text => text.plain_text).join('') || '');
        case 'heading_3':
            return '### ' + (block.heading_3?.rich_text?.map(text => text.plain_text).join('') || '');
        case 'bulleted_list_item':
            return '• ' + (block.bulleted_list_item?.rich_text?.map(text => text.plain_text).join('') || '');
        case 'numbered_list_item':
            return '1. ' + (block.numbered_list_item?.rich_text?.map(text => text.plain_text).join('') || '');
        case 'to_do':
            return `[${block.to_do?.checked ? 'x' : ' '}] ` + (block.to_do?.rich_text?.map(text => text.plain_text).join('') || '');
        case 'toggle':
            return '▸ ' + (block.toggle?.rich_text?.map(text => text.plain_text).join('') || '');
        case 'code':
            return '```' + (block.code?.language || '') + '\n' + 
                   (block.code?.rich_text?.map(text => text.plain_text).join('') || '') + 
                   '\n```';
        case 'quote':
            return '> ' + (block.quote?.rich_text?.map(text => text.plain_text).join('') || '');
        default:
            return '';
    }
};

const formatSearchResult = (result) => {
    return {
        id: result.id,
        type: result.object,
        title: extractTitle(result),
        url: result.url,
        lastEdited: result.last_edited_time,
        created: result.created_time,
        preview: result.object === 'page' ? extractPreview(result) : undefined
    };
};

const formatProperties = (properties) => {
    if (!properties) return {};

    return Object.entries(properties).reduce((acc, [key, value]) => {
        acc[key] = formatPropertyValue(value);
        return acc;
    }, {});
};

const formatPropertyValue = (property) => {
    if (!property) return null;

    switch (property.type) {
        case 'title':
        case 'rich_text':
            return property[property.type]?.[0]?.plain_text || '';
        case 'select':
            return property.select?.name || '';
        case 'multi_select':
            return property.multi_select?.map(item => item.name) || [];
        case 'date':
            return property.date;
        case 'checkbox':
            return property.checkbox;
        case 'number':
            return property.number;
        case 'url':
            return property.url;
        case 'email':
            return property.email;
        case 'phone_number':
            return property.phone_number;
        default:
            return null;
    }
};

// Tìm kiếm theo text
const searchByText = async (text) => {
    try {
        // Tìm kiếm trong tất cả các pages
        const response = await notion.search({
            query: text,
            filter: {
                property: 'object',
                value: 'page'
            },
            sort: {
                direction: 'descending',
                timestamp: 'last_edited_time'
            },
            page_size: 20
        });

        // Format kết quả
        const results = response.results.map(page => ({
            id: page.id,
            title: extractTitle(page),
            description: extractPreview(page),
            url: page.url,
            lastEdited: page.last_edited_time,
            created: page.created_time,
            properties: formatProperties(page.properties)
        }));

        return {
            results,
            hasMore: response.has_more,
            nextCursor: response.next_cursor
        };
    } catch (error) {
        console.error('Error searching by text:', error);
        throw error;
    }
};

module.exports = {
    searchAll,
    searchArticles,
    searchDocs,
    searchDatabase,
    getPageContent,
    getBlockChildren,
    getDatabaseContent,
    listDatabases,
    getArticleContent,
    searchByText
}; 