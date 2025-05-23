const workShiftService = require('../services/workShiftService');

const saveWorkShift = async (req, res) => {
    const workShift = req.body;
    console.log(workShift);
    for (const shift of workShift) {
        await workShiftService.createWorkShift(shift);
    }
    res.status(200).json({ message: 'Work shift created successfully' });
};

const getWorkShift = async (req, res) => {
    const { date } = req.query;
    const workShift = await workShiftService.getWorkShift(date);
    res.status(200).json(workShift);
};

module.exports = {
    saveWorkShift,
    getWorkShift,
};