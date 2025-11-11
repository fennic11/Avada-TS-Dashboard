const reviewsService = require("../services/reviewsService");

const getReviews = async (req, res) => {
    const { fromDate, toDate } = req.query;
    console.log('fromDate', fromDate);
    console.log('toDate', toDate);
    const reviews = await reviewsService.getReviewsByDate(fromDate, toDate);
    res.json(reviews);
}

module.exports = {
    getReviews
}