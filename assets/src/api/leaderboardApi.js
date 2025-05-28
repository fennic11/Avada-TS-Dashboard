import { API_URL } from './apiConfig';  

export const getLeaderboard = async (time) => {
    const response = await fetch(`${API_URL}/leaderboard?time=${time}`);
    return response.json();
};

export const createLeaderboard = async (leaderboard) => {
    console.log(leaderboard);
    const response = await fetch(`${API_URL}/leaderboard`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(leaderboard),
    });
    return response.json();
};