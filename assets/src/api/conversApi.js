import { API_URL } from './apiConfig';

const getConversation = async (fromDate, toDate) => {
    const response = await fetch(`${API_URL}/convers?fromDate=${fromDate}&toDate=${toDate}`);
    return response.json();
}

export default getConversation;