const getReviewsByDate = async (fromDate, toDate) => {
    try {
        console.log(`Fetching reviews from ${fromDate} to ${toDate}`);

        const response = await fetch(`https://public.avada.io/publicApi/reviewList?start=${fromDate}T17:00:00.000Z&end=${toDate}T16:59:59.059Z&sort=reviewDate_desc`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const jsonData = await response.json();

        // Extract data from response
        const reviews = jsonData.data || [];

        return reviews;
    } catch (error) {
        console.error('Error fetching reviews:', error);
        throw error;
    }
}

module.exports = {
    getReviewsByDate
}