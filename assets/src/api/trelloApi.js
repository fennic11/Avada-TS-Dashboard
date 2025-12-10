import dayjs from 'dayjs';

// Lấy key và token từ localStorage
const getCredentials = () => {
    const user = localStorage.getItem('user');
    if (!user) {
        throw new Error('User not found in localStorage');
    }
    const userData = JSON.parse(user);
    return {
        key: userData.apiKey || "6617086a2ab6e15e6c89bd4466ce8839",
        token: userData.token || "ATTAdcc1a6c00170c2de207cda726497211c43fa01dab5b18d0eced273cbce16ac195DADA9A9"
    };
};

const API_URL = `https://api.trello.com/1`;
const BOARD_ID = process.env.REACT_APP_BOARD_ID || "638d769884c52b05235a2310";

export async function getCardsByList(listId) {
    
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/lists/${listId}/cards?key=${key}&token=${token}`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch cards for list ${listId}: ${resp.statusText}`);
        }
        const cards = await resp.json();
        return cards;
    } catch (error) {
        console.error(`Error getting cards for list ${listId}:`, error);
        return null;
    }
}

export async function getDevFixingCards(listId) {
    
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/lists/${listId}/cards?key=${key}&token=${token}`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch cards for list ${listId}: ${resp.statusText}`);
        }
        const cards = await resp.json();
        return cards;
    } catch (error) {
        console.error(`Error getting cards for list ${listId}:`, error);
        return null;
    }
}

export async function getCardsByListandMember(listId, idMember) {
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/lists/${listId}/cards?key=${key}&token=${token}`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch cards for list ${listId}: ${resp.statusText}`);
        }

        const allCards = await resp.json();
        // Filter cards by member ID
        const memberCards = allCards.filter(card => 
            card.idMembers && card.idMembers.includes(idMember)
        );
        return memberCards;
    } catch (error) {
        console.error(`Error getting cards for list ${listId}:`, error);
        return null;
    }
}

export async function getListsByBoardId() {
    try {
        const { key, token } = getCredentials();
        const openListsRes = await fetch(`${API_URL}/boards/${BOARD_ID}/lists?key=${key}&token=${token}`, {
            headers: {
                Accept: "application/json"
            }
        });

        const closedListsRes = await fetch(`${API_URL}/boards/${BOARD_ID}/lists?key=${key}&token=${token}&filter=closed`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!openListsRes.ok) {
            throw new Error(`Failed to fetch open lists for board ${BOARD_ID}: ${openListsRes.statusText}`);
        }

        if (!closedListsRes.ok) {
            throw new Error(`Failed to fetch closed lists for board ${BOARD_ID}: ${closedListsRes.statusText}`);
        }

        const openLists = await openListsRes.json();
        const closedLists = await closedListsRes.json();

        return [...openLists, ...closedLists];
    } catch (error) {
        console.error(`Error getting lists for board ${BOARD_ID}:`, error);
        return null;
    }
}

export async function getActionsByCard(cardId) {
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/cards/${cardId}/actions?filter=all&key=${key}&token=${token}&limit=100`, {
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

export async function getCreateCardAction(cardId) {
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/cards/${cardId}/actions?filter=createCard&key=${key}&token=${token}`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch actions for card ${cardId}: ${resp.statusText}`);
        }

        const actions = await resp.json();
        if (actions && actions.length > 0) {
            // Trello stores time in UTC, add 7 hours to convert to Vietnam time
            const utcDate = new Date(actions[0].date);
            const vnDate = new Date(utcDate.getTime() + 7 * 60 * 60 * 1000);
            return vnDate.toISOString();
        }
        return null;
    } catch (error) {
        console.error(`Error getting actions for card ${cardId}:`, error);
        return null;
    }
}

export async function removeMemberByID(cardId, idMember) {
    try {
        const { key, token } = getCredentials();

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
        const { key, token } = getCredentials();

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

export const addMemberByID = async (cardId, memberId) => {
    try {
        const { key, token } = getCredentials();
        const response = await fetch(`${API_URL}/cards/${cardId}/idMembers?key=${key}&token=${token}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                value: memberId
            })
        });

        if (!response.ok) {
            throw new Error('Failed to add member to card');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error adding member:', error);
        throw error;
    }
};

export async function addLabelByID(cardId, idLabel) {
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/cards/${cardId}/idLabels?key=${key}&token=${token}&value=${idLabel}`, {
            method: "POST",
            headers: {
                Accept: "application/json"
            },
            body: JSON.stringify({ value: idLabel })
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
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/cards/${cardId}?key=${key}&token=${token}`;

        const body = new URLSearchParams();
        body.append('idList', newListId);

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
        return data;
    } catch (error) {
        console.error('Lỗi khi chuyển card:', error.message);
        throw error;
    }
}

export async function addCommentToCard(cardId, text) {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/cards/${cardId}/actions/comments?text=${text}&key=${key}&token=${token}`;

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
        return data;
    } catch (error) {
        console.error('Error:', error.message);
        throw error;
    }
}

export async function getCardsByBoardAndMember(idMember) {
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/boards/${BOARD_ID}/cards/member/${idMember}?key=${key}&token=${token}&fields=all`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch cards for member ${idMember}: ${resp.statusText}`);
        }

        const cards = await resp.json();
        return cards;
    } catch (error) {
        console.error(`Error getting cards for member ${idMember}:`, error);
        return null;
    }
}

export async function getBoardMembers(boardId) {
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/boards/${boardId}/members?key=${key}&token=${token}&fields=id,fullName,username,avatarUrl,initials`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch board members: ${resp.statusText}`);
        }

        return await resp.json();
    } catch (error) {
        console.error('Error fetching board members:', error);
        throw error;
    }
}

export async function getMembers() {
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/boards/${BOARD_ID}/members?key=${key}&token=${token}&fields=id,fullName,username,avatarUrl,initials`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch members: ${resp.statusText}`);
        }

        return await resp.json();
    } catch (error) {
        console.error('Error fetching members:', error);
        throw error;
    }
}

export async function addAttachmentToCard(cardId, file) {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/cards/${cardId}/attachments?key=${key}&token=${token}`;
        
        const response = await fetch(url, {
            method: 'POST',
            body: file
        });

        if (!response.ok) {
            throw new Error(`Failed to upload attachment: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error uploading attachment:', error);
        throw error;
    }
}

export async function getCardAttachments(cardId) {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/cards/${cardId}/attachments?key=${key}&token=${token}`;
        
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get attachments: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting attachments:', error);
        throw error;
    }
}

export async function deleteAttachment(cardId, attachmentId) {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/cards/${cardId}/attachments/${attachmentId}?key=${key}&token=${token}`;
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to delete attachment: ${response.status} ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error('Error deleting attachment:', error);
        throw error;
    }
}

export async function updateCardDescription(cardId, description) {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/cards/${cardId}?key=${key}&token=${token}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({ desc: description })
        });

        if (!response.ok) {
            throw new Error(`Failed to update description: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating description:', error);
        throw error;
    }
}

export async function updateCardName(cardId, name) {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/cards/${cardId}?key=${key}&token=${token}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({ name })
        });

        if (!response.ok) {
            throw new Error(`Failed to update card name: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating card name:', error);
        throw error;
    }
}

export async function updateCardDueDate(cardId, dueDate) {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/cards/${cardId}?key=${key}&token=${token}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({ due: dueDate })
        });

        if (!response.ok) {
            throw new Error(`Failed to update due date: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating due date:', error);
        throw error;
    }
}

export async function getCardById(cardId) {
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/cards/${cardId}?key=${key}&token=${token}`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch card ${cardId}: ${resp.statusText}`);
        }

        return await resp.json();
    } catch (error) {
        console.error(`Error getting card ${cardId}:`, error);
        return null;
    }
}

export async function getMemberNotifications() {
    try {
        const user = localStorage.getItem('user');
        if (!user) {
            throw new Error('User not found in localStorage');
        }
        const userData = JSON.parse(user);
        const trelloId = userData.trelloId;
        if (!trelloId) {
            throw new Error('Trello ID not found in localStorage');
        }

        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/members/${trelloId}/notifications?key=${key}&token=${token}&filter=all`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch notifications: ${resp.statusText}`);
        }

        const notifications = await resp.json();
        return notifications;
    } catch (error) {
        console.error('Error fetching member notifications:', error);
        return null;
    }
}

export async function markAllNotificationsAsRead() {
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/notifications/all/read?key=${key}&token=${token}`, {
            method: 'POST',
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to mark notifications as read: ${resp.statusText}`);
        }

        return true;
    } catch (error) {
        console.error('Error marking notifications as read:', error);
        return false;
    }
}

export const updateNotificationStatus = async (notificationId, isRead) => {
    try {
        const { key, token } = getCredentials();
        const response = await fetch(`${API_URL}/notifications/${notificationId}?key=${key}&token=${token}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                unread: !isRead
            })
        });

        if (!response.ok) {
            throw new Error('Failed to update notification status');
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating notification status:', error);
        return null;
    }
};

export async function updateCardDueComplete(cardId, dueComplete) {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/cards/${cardId}?key=${key}&token=${token}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({ dueComplete })
        });

        if (!response.ok) {
            throw new Error(`Failed to update dueComplete status: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating dueComplete status:', error);
        throw error;
    }
}

export const getBoardLabels = async (boardId) => {
    try {
        const { key, token } = getCredentials();
        const response = await fetch(`${API_URL}/boards/${boardId}/labels?key=${key}&token=${token}&limit=500`);
        if (!response.ok) {
            throw new Error('Failed to fetch board labels');
        }
        return await response.json();
    } catch (error) {
        console.error('Error fetching board labels:', error);
        throw error;
    }
};

export async function getCreateCardByCard(cardId) {
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/cards/${cardId}/actions?filter=createCard&key=${key}&token=${token}`, {
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


export async function getCardsByBoardWithDateFilter(since, before, enableGetActions=false) {
    try {
        const { key, token } = getCredentials();
        let url = `${API_URL}/boards/${BOARD_ID}/cards?key=${key}&token=${token}`;
        
        // Add date filters if provided
        if (since) {
            url += `&since=${since}`; // ISO-formatted date or Mongo ID
        }
        if (before) {
            url += `&before=${before}`; // ISO-formatted date or Mongo ID
        }

        // Add member filter if provided
        if (enableGetActions) {
            url += '&actions=updateCard';
        }
        // Add additional useful fields
        url += '&fields=id,name,idList,idMembers,labels,url,due';
        const resp = await fetch(url, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch cards: ${resp.statusText}`);
        }

        const cards = await resp.json();
        return cards;
    } catch (error) {
        console.error('Error getting cards with date filters:', error);
        return null;
    }
}

export async function searchCards(query) {
    try {
        const { key, token } = getCredentials();
        const resp = await fetch(`${API_URL}/search?key=${key}&token=${token}&query=${query}&idBoards=${BOARD_ID}`, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to search cards: ${resp.statusText}`);
        }

        return await resp.json();
    } catch (error) {
        console.error('Error searching cards:', error);
        return null;
    }
}

export async function getCardsByBoardForPerformanceTS(since, before) {
    try {
        const { key, token } = getCredentials();
        let url = `${API_URL}/boards/${BOARD_ID}/cards?key=${key}&token=${token}`;
        
        // Add date filters if provided
        if (since) {
            url += `&since=${since}`; // ISO-formatted date or Mongo ID
        }
        if (before) {
            url += `&before=${before}`; // ISO-formatted date or Mongo ID
        }
        // Add additional useful fields
        url += '&fields=id,name,idList,idMembers,labels,dueComplete&actions=createCard,addMemberToCard,removeMemberFromCard,updateCard';
        const resp = await fetch(url, {
            headers: {
                Accept: "application/json"
            }
        });

        if (!resp.ok) {
            throw new Error(`Failed to fetch cards: ${resp.statusText}`);
        }

        const cards = await resp.json();
        return cards;
    } catch (error) {
        console.error('Error getting cards with date filters:', error);
        return null;
    }
}

/**
 * Lấy tất cả actions của 1 member trên toàn board trong khoảng thời gian (dùng trực tiếp endpoint actions của board)
 * @param {string} memberId - id của member
 * @param {string} since - ISO string bắt đầu
 * @param {string} before - ISO string kết thúc
 * @param {string} filter - loại action (all, hoặc comma-separated types)
 * @param {number} limit - số lượng action tối đa (max 1000/lần gọi)
 * @returns {Promise<Array>} - Mảng actions của member này trong khoảng thời gian đó
 */
export async function getBoardActionsByMemberAndDate(since, before, limit = 1000) {
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

export async function getManyActionsOnBoard(since, before) {
    try {
        const sinceDate = dayjs(since);
        const beforeDate = dayjs(before);

        const totalMs = beforeDate.diff(sinceDate);
        const split1 = sinceDate.add(totalMs / 4, 'millisecond');
        const split2 = sinceDate.add((2 * totalMs) / 4, 'millisecond');
        const split3 = sinceDate.add((3 * totalMs) / 4, 'millisecond');

        const range1Since = sinceDate.toISOString();
        const range1Before = split1.toISOString();
        const range2Since = split1.toISOString();
        const range2Before = split2.toISOString();
        const range3Since = split2.toISOString();
        const range3Before = split3.toISOString();
        const range4Since = split3.toISOString();
        const range4Before = beforeDate.toISOString();

        console.log('since:', since, 'before:', before);
        console.log('range1:', range1Since, range1Before);
        console.log('range2:', range2Since, range2Before);
        console.log('range3:', range3Since, range3Before);
        console.log('range4:', range4Since, range4Before);

        const [actions1, actions2, actions3, actions4] = await Promise.all([
            getBoardActionsByMemberAndDate(range1Since, range1Before),
            getBoardActionsByMemberAndDate(range2Since, range2Before),
            getBoardActionsByMemberAndDate(range3Since, range3Before),
            getBoardActionsByMemberAndDate(range4Since, range4Before)
        ]);
        console.log(actions1.length, actions2.length, actions3.length, actions4.length);

        return [...actions1, ...actions2, ...actions3, ...actions4];
    } catch (error) {
        console.error('Error getManyActionsOnBoard:', error);
        return [];
    }
}

/**
 * Tạo webhook cho board
 * @param {string} callbackURL - URL callback cho webhook
 * @param {string} description - Mô tả webhook
 * @param {string} idModel - ID của model (board, card, list, etc.)
 * @returns {Promise<Object>} - Thông tin webhook đã tạo
 */
export async function createWebhook(callbackURL, description, idModel) {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/webhooks?key=${key}&token=${token}`;
        
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify({
                callbackURL,
                description,
                idModel
            })
        });

        if (!response.ok) {
            throw new Error(`Failed to create webhook: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        console.log('data', data);
        return data;
    } catch (error) {
        console.error('Error creating webhook:', error);
        throw error;
    }
}

/**
 * Lấy danh sách webhooks
 * @returns {Promise<Array>} - Danh sách webhooks
 */
export async function getWebhooks() {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/tokens/${token}/webhooks?key=${key}`;
        
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get webhooks: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting webhooks:', error);
        throw error;
    }
}

/**
 * Lấy thông tin webhook theo ID
 * @param {string} webhookId - ID của webhook
 * @returns {Promise<Object>} - Thông tin webhook
 */
export async function getWebhookById(webhookId) {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/webhooks/${webhookId}?key=${key}&token=${token}`;
        
        const response = await fetch(url, {
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to get webhook: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error getting webhook by ID:', error);
        throw error;
    }
}

/**
 * Cập nhật webhook
 * @param {string} webhookId - ID của webhook
 * @param {Object} updateData - Dữ liệu cập nhật (callbackURL, description, active)
 * @returns {Promise<Object>} - Thông tin webhook đã cập nhật
 */
export async function updateWebhook(webhookId, updateData) {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/webhooks/${webhookId}?key=${key}&token=${token}`;
        
        const response = await fetch(url, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json'
            },
            body: JSON.stringify(updateData)
        });

        if (!response.ok) {
            throw new Error(`Failed to update webhook: ${response.status} ${response.statusText}`);
        }

        const data = await response.json();
        return data;
    } catch (error) {
        console.error('Error updating webhook:', error);
        throw error;
    }
}

/**
 * Xóa webhook
 * @param {string} webhookId - ID của webhook
 * @returns {Promise<boolean>} - True nếu xóa thành công
 */
export async function deleteWebhook(webhookId) {
    try {
        const { key, token } = getCredentials();
        const url = `${API_URL}/webhooks/${webhookId}?key=${key}&token=${token}`;
        
        const response = await fetch(url, {
            method: 'DELETE',
            headers: {
                Accept: 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Failed to delete webhook: ${response.status} ${response.statusText}`);
        }

        return true;
    } catch (error) {
        console.error('Error deleting webhook:', error);
        throw error;
    }
}

/**
 * Lấy actions addMemberToCard theo ngày
 * @param {string} since - ISO string bắt đầu
 * @param {string} before - ISO string kết thúc
 * @param {number} limit - số lượng action tối đa (max 1000/lần gọi)
 * @returns {Promise<Array>} - Mảng actions addMemberToCard trong khoảng thời gian đó
 */
export async function getAddMemberToCardActionsByDate(since, before, limit = 1000) {
    try {
        const { key, token } = getCredentials();
        let url = `${API_URL}/boards/${BOARD_ID}/actions?key=${key}&token=${token}`;
        url += `&filter=addMemberToCard`;
        url += `&limit=${limit}`;
        if (since) url += `&since=${since}`;
        if (before) url += `&before=${before}`;
        
        const resp = await fetch(url, { 
            headers: { Accept: 'application/json' } 
        });
        
        if (!resp.ok) {
            throw new Error(`Failed to fetch addMemberToCard actions: ${resp.statusText}`);
        }
        
        const actions = await resp.json();
        return actions;
    } catch (error) {
        console.error('Error getAddMemberToCardActionsByDate:', error);
        return [];
    }
}

