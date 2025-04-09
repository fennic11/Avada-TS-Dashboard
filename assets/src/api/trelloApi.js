const key = process.env.REACT_APP_TRELLO_KEY || "6617086a2ab6e15e6c89bd4466ce8839";
const token = process.env.REACT_APP_TRELLO_TOKEN || "ATTAdcc1a6c00170c2de207cda726497211c43fa01dab5b18d0eced273cbce16ac195DADA9A9";
const API_URL = `https://api.trello.com/1`;
const BOARD_ID = process.env.REACT_APP_BOARD_ID || "638d769884c52b05235a2310";






export async function getCardsByList(listId) {
    try {
        const resp = await fetch(`${API_URL}/lists/${listId}/cards?key=${key}&token=${token}`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch cards for list ${listId}: ${resp.statusText}`);
        }

        return await resp.json();
    } catch (error) {
        console.error(`Error getting cards for list ${listId}:`, error);
        return null;
    }
}

export async function getListsByBoardId(boardId) {
    try {
        const openListsRes = await fetch(`${API_URL}/boards/${boardId}/lists?key=${key}&token=${token}`, {
            headers: {
                Accept: "application/json"
            }
        });

        const closedListsRes = await fetch(`${API_URL}/boards/${boardId}/lists?key=${key}&token=${token}&filter=closed`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!openListsRes.ok) {
            throw new Error(`Failed to fetch open lists for board ${boardId}: ${openListsRes.statusText}`);
        }

        if (!closedListsRes.ok) {
            throw new Error(`Failed to fetch closed lists for board ${boardId}: ${closedListsRes.statusText}`);
        }

        const openLists = await openListsRes.json();
        const closedLists = await closedListsRes.json();

        return [...openLists, ...closedLists];
    } catch (error) {
        console.error(`Error getting lists for board ${boardId}:`, error);
        return null;
    }
}


export async function getMembers(boardId) {
    const resp = await fetch(`${API_URL}/boards/${boardId}/members?key=${key}&token=${token}`, {
        headers: {
            Accept: "application/json"
        }
    })
    return await resp.json();
}

export async function getActionsByCard(cardId) {
    try {
        const resp = await fetch(`${API_URL}/cards/${cardId}/actions?key=${key}&token=${token}`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch actions for card ${cardId}: ${resp.statusText}`);
        }

        return await resp.json();
    } catch (error) {
        console.error(`Error getting actions for card ${cardId}:`, error);
        return null;
    }
}


export async function removeMemberByID(cardId, idMember) {
    try {
        console.log(`Removing member ${idMember} from card ${cardId}...`);

        const resp = await fetch(`${API_URL}/cards/${cardId}/idMembers/${idMember}?key=${key}&token=${token}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to remove member: ${resp.status} ${resp.statusText}`);
        }

        return resp.status === 204 ? null : await resp.json();
    } catch (error) {
        console.error("Error removing member from card:", error);
        throw error;
    }
}

export async function removeLabelByID(cardId, idLabel) {
    try {
        console.log(`Removing label ${idLabel} from card ${cardId}...`);

        const resp = await fetch(`${API_URL}/cards/${cardId}/idLabels/${idLabel}?key=${key}&token=${token}`, {
            method: "DELETE",
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to remove label: ${resp.status} ${resp.statusText}`);
        }

        return resp.status === 204 ? null : await resp.json();
    } catch (error) {
        console.error("Error removing label from card:", error);
        throw error;
    }
}


export async function addMemberByID(cardId, idMember) {
    console.log(idMember);
    try {
        const resp = await fetch(`${API_URL}/cards/${cardId}/idMembers?key=${key}&token=${token}&value=${idMember}`, {
            method: "POST",
            headers: {
                Accept: "application/json"
            },
            body: JSON.stringify({ value: idMember }) // Trello API có thể yêu cầu gửi ID dưới dạng body
        });

        if (!resp.ok) {
            throw new Error(`Failed to add member: ${resp.status} ${resp.statusText}`);
        }

        return await resp.json();
    } catch (error) {
        console.error("Error adding member to card:", error);
        throw error;
    }
}

export async function addLabelByID(cardId, idLabel) {
    try {
        const resp = await fetch(`${API_URL}/cards/${cardId}/idLabels?key=${key}&token=${token}&value=${idLabel}`, {
            method: "POST",
            headers: {
                Accept: "application/json"
            },
            body: JSON.stringify({ value: idLabel }) // Trello API có thể yêu cầu gửi ID dưới dạng body
        });

        if (!resp.ok) {
            throw new Error(`Failed to add label: ${resp.status} ${resp.statusText}`);
        }

        return await resp.json();
    } catch (error) {
        console.error("Error adding label to card:", error);
        throw error;
    }
}


export async function moveCardToList(cardId, newListId) {
    const url = `https://api.trello.com/1/cards/${cardId}?key=${key}&token=${token}`;

    const body = new URLSearchParams();
    body.append('idList', newListId);

    try {
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                Accept: 'application/json'
            },
            body
        });

        if (!response.ok) {
            throw new Error(`Failed to move card: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Card đã được chuyển thành công:', data);
        return data;
    } catch (error) {
        console.error('Lỗi khi chuyển card:', error.message);
        throw error;
    }
}

export async function addCommentToCard(cardId, text) {
    const url = `https://api.trello.com/1/cards/${cardId}/actions/comments?text=${text}&key=${key}&token=${token}`;


    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to comment: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('Complete Comment:', data);
        return data;
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

export async function getCardsByBoardAndMember(idMember) {
    try {
        const resp = await fetch(`${API_URL}/boards/${BOARD_ID}/cards/member/${idMember}?key=${key}&token=${token}&fields=all`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch cards for member ${idMember}: ${resp.statusText}`);
        }

        const cards = await resp.json();
        console.log(`Found ${cards.length} cards for member ${idMember}`);
        return cards;
    } catch (error) {
        console.error(`Error getting cards for member ${idMember}:`, error);
        return null;
    }
}
