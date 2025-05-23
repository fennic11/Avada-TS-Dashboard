const cron = require('node-cron');
const { sendNotificationsToTSMembers } = require('../services/slackNotificationService');

// Chạy vào 0h, 4h, 8h, 12h, 16h, 18h, 20h mỗi ngày
const schedule = '0 0,4,8,12,16,18,20 * * *';

const getShiftInfo = (hour) => {
    const now = new Date();
    const date = now.toISOString().split('T')[0];
    
    // Xác định ca dựa trên giờ
    let shift;
    switch(hour) {
        case 0:
            shift = '1';
            break;
        case 4:
            shift = '2';
            break;
        case 8:
            shift = '3';
            break;
        case 12:
            shift = '4';
            break;
        case 16:
            shift = '5.1';
            break;
        case 18:
            shift = '5.2';
            break;
        case 20:
            shift = '6';
            break;
        default:
            shift = 'Unknown';
    }

    return { date, shift };
};

const startSlackNotificationCron = () => {
    console.log('Starting Slack notification cron job...');
    
    cron.schedule(schedule, async () => {
        try {
            const currentHour = new Date().getHours();
            const { date, shift } = getShiftInfo(currentHour);
            
            console.log(`Running Slack notification cron job for ${shift} on ${date}...`);
            await sendNotificationsToTSMembers(date, shift);
            console.log(`Slack notification sent successfully for ${shift}`);
        } catch (error) {
            console.error('Error in Slack notification cron job:', error);
        }
    });

    console.log(`Slack notification cron job scheduled to run at ${schedule}`);
};

module.exports = {
    startSlackNotificationCron
}; 