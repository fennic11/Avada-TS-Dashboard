import { API_URL } from './apiConfig';

const getReviews = async (fromDate, toDate) => {
    const response = await fetch(`${API_URL}/reviews?fromDate=${fromDate}&toDate=${toDate}`);
    return response.json();
}

export default getReviews;