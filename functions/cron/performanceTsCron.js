const cron = require('node-cron');
const { getTrelloNotification } = require('../controllers/trelloNotificationController');

// Chạy vào 0h, 4h, 8h, 12h, 16h, 18h, 20h mỗi ngày
const schedule = '28 14 * * *';


const getShiftInfo = () => {
    const now = new Date();
    // Add 7 hours to compensate for timezone difference
    // now.setHours(now.getHours() + 7);
    const date = now.toISOString().split('T')[0];
    const adjustedHour = now.getHours();
    console.log('shiftTime', adjustedHour);
    
    // Xác định ca dựa trên giờ đã điều chỉnh
    let shift;
    switch(adjustedHour) {
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

const startPerformanceTsCron = () => {
    console.log('Starting Slack notification cron job...');
    
    cron.schedule(schedule, async () => {
        try {
            const { date, shift } = getShiftInfo();
            console.log(date, shift);
            
            console.log(`Running Slack notification cron job for ${shift} on ${date}...`);
            await getTrelloNotification(date, shift);
            console.log(`Slack notification sent successfully for ${shift}`);
        } catch (error) {
            console.error('Error in Slack notification cron job:', error);
        }
    });

    console.log(`Slack notification cron job scheduled to run at ${schedule}`);
};

module.exports = {
    startPerformanceTsCron
}