const WorkShift = require('../models/WorkShift');

const createWorkShift = async (workShift) => {
    const newWorkShift = new WorkShift(workShift);
    await newWorkShift.save();
    return newWorkShift;
};

const getWorkShift = async (date) => {
    const workShift = await WorkShift.findOne({ date });
    return workShift;
};

const updateWorkShift = async (date, workShift) => {
    const updatedWorkShift = await WorkShift.findOneAndUpdate({ date }, workShift, { new: true });
    return updatedWorkShift;
};

module.exports = {
    createWorkShift,
    getWorkShift,
    updateWorkShift
};