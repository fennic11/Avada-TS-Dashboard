const key = process.env.TRELLO_API_KEY;
const token = process.env.TRELLO_TOKEN;

const getCardsByList = async (listId) => {
    const response = await fetch(`https://api.trello.com/1/lists/${listId}/cards?key=${key}&token=${token}&fields=name,idMembers,shortUrl,idList`, {
        headers: {
            Accept: "application/json"
        }
    });
    const data = await response.json();
    return data;
}

module.exports = {
    getCardsByList
}