const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';

export async function createConversation(note) {
    const response = await fetch(`${API_BASE_URL}/crisp/createConversation`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ note }),
    });
    return response.json();
}
