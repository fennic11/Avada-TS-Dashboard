const Leaderboard = require('../models/Leaderboard');

const getLeaderboard = async (time) => {
    const leaderboard = await Leaderboard.findOne({ time });
    return leaderboard;
};

const createLeaderboard = async (leaderboard) => {  
    console.log(leaderboard);
    // const newLeaderboard = new Leaderboard({ leaderboard });
    // await newLeaderboard.save();
    // return newLeaderboard;
};

module.exports = {
    getLeaderboard,
    createLeaderboard
};