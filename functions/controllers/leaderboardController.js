const leaderboardService = require('../services/leaderboardService');

const getLeaderboard = async (req, res) => {
    const { month, year } = req.query;
    const leaderboard = await leaderboardService.getLeaderboard(month, year);
    res.json(leaderboard);
};

const createLeaderboard = async (req, res) => {
    const  leaderboard  = req.body;
    console.log(req.body);
    const newLeaderboard = await leaderboardService.createLeaderboard(leaderboard);
    res.json(newLeaderboard);
};

module.exports = {
    getLeaderboard,
    createLeaderboard
};