const cron = require('node-cron');  
const { getWorkShiftByDateRange } = require('../services/workShiftService');
const schedule = '"*/30 * * * *"';

const startPerformanceTsCron = () => {
    console.log('Starting Performance TS cron job...');
    cron.schedule(schedule, async () => {
        try {
            console.log('Performance TS cron job running...');
            const workShifts = await getWorkShiftByDateRange(date, formattedHour);
            console.log('workShifts', workShifts);
        } catch (error) {
            console.error('Error in Performance TS cron job:', error);
        }
    });
    console.log(`Performance TS cron job scheduled to run at ${schedule}`);
};

module.exports = {
    startPerformanceTsCron
}