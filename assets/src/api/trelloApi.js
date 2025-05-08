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

        return await resp.json();
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
        
        console.log(`Found ${memberCards.length} cards for member ${idMember} in list ${listId}`);
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
        const resp = await fetch(`${API_URL}/cards/${cardId}/actions?filter=all&key=${key}&token=${token}`, {
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
            return actions[0].date;
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
        const { key, token } = getCredentials();
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
        console.log('Card đã được chuyển thành công:', data);
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
        console.log('Complete Comment:', data);
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
        console.log(`Found ${cards.length} cards for member ${idMember}`);
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
        console.log('Attachment uploaded successfully:', data);
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
        console.log(notifications);
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
        const response = await fetch(`${API_URL}/boards/${boardId}/labels?key=${key}&token=${token}&limit=100`);
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

