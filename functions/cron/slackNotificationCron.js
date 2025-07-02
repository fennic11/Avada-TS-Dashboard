const cron = require('node-cron');
const { sendNotificationsToTSMembers } = require('../services/slackNotificationService');
const { getWorkShiftByDateRange } = require('../services/workShiftService');

// Chạy vào 0h, 4h, 8h, 12h, 16h, 18h, 20h mỗi ngày
const schedule = '10 17,21,1,5,9,11,13 * * *';
// const schedule = '33 0,4,8,12,16,18,20,15 * * *';

const startSlackNotificationCron = () => {
    console.log('Starting Slack notification cron job...');
    
    cron.schedule(schedule, async () => {
        try {
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const adjustedHour = now.getHours();
            const formattedHour = adjustedHour < 10 ? `0${adjustedHour}` : adjustedHour;
            const workShifts = await getWorkShiftByDateRange(date, formattedHour);
            console.log('workShifts', workShifts);

            await sendNotificationsToTSMembers(workShifts);

        } catch (error) {
            console.error('Error in Slack notification cron job:', error);
        }
    });

    console.log(`Slack notification cron job scheduled to run at ${schedule}`);
};

module.exports = {
    startSlackNotificationCron
}; 