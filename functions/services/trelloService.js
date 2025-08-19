const key = process.env.TRELLO_API_KEY;
const token = process.env.TRELLO_TOKEN;
const BOARD_ID = process.env.BOARD_ID;

const getCardsByList = async (listId) => {
    const response = await fetch(`https://api.trello.com/1/lists/${listId}/cards?key=${key}&token=${token}&fields=name,idMembers,shortUrl,idList,desc`, {
        headers: {
            Accept: "application/json"
        }
    });
    const data = await response.json();
    return data;
}

const getBoardActionsByMemberAndDate = async (since, before, limit = 1000) => {
    try {
        const { key, token } = getCredentials();
        let url = `${API_URL}/boards/${BOARD_ID}/actions?key=${key}&token=${token}`;
        url += `&filter=createCard,removeMemberFromCard,updateCard,addMemberToCard,commentCard`;
        url += `&limit=${limit}`;
        if (since) url += `&since=${since}`;
        if (before) url += `&before=${before}`;
        const resp = await fetch(url, { headers: { Accept: 'application/json' } });
        if (!resp.ok) throw new Error(`Failed to fetch board actions: ${resp.statusText}`);
        const actions = await resp.json();
        // Trả về toàn bộ actions, không lọc theo memberId nữa
        return actions;
    } catch (error) {
        console.error('Error getBoardActionsByMemberAndDate:', error);
        return [];
    }
}
const getCardById = async (cardId) => {
    const response = await fetch(`https://api.trello.com/1/cards/${cardId}?key=${key}&token=${token}&fields=name,shortUrl,labels,idBoard&actions=createCard&action_fields=date,idMemberCreator`, {
        headers: {
            Accept: "application/json"
        }
    });
    const data = await response.json();
    
    // Filter and transform the data
    const filteredData = {
        ...data,
        createAt: data.actions && data.actions.length > 0 ? data.actions[0].date : null,
        idMemberCreator: data.actions && data.actions.length > 0 ? data.actions[0].idMemberCreator : null
    };
    
    // Remove the original actions array
    delete filteredData.actions;
    
    // Log labels for debugging
    console.log('📋 Card labels processed:', filteredData.labels);
    console.log('📋 Original labels count:', data.labels ? data.labels.length : 0);
    console.log('📋 Filtered labels count:', filteredData.labels.length);
    
    return filteredData;
}

module.exports = {
    getCardsByList,
    getBoardActionsByMemberAndDate,
    getCardById
}