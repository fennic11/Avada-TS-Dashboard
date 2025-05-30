const Leaderboard = require('../models/Leaderboard');

const getLeaderboard = async (month, year) => {
    const leaderboard = await Leaderboard.findOne({ month, year });
    return leaderboard;
};

const createLeaderboard = async (leaderboard) => {  
    console.log(leaderboard);
    const newLeaderboard = new Leaderboard(leaderboard);
    await newLeaderboard.save();
    return newLeaderboard;
};

module.exports = {
    getLeaderboard,
    createLeaderboard
};