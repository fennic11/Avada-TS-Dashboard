const cron = require('node-cron');
const { sendNotificationsToTSMembers } = require('../services/slackNotificationService');
const { getWorkShiftByDateRange } = require('../services/workShiftService');

// Chạy vào 0h, 4h, 8h, 12h, 16h, 18h, 20h mỗi ngày
const schedule = '10 17,21,1,5,9,11,13 * * *';

// Track if job is currently running to prevent overlapping executions
let isJobRunning = false;

const startSlackNotificationCron = () => {
    console.log('Starting Slack notification cron job...');

    cron.schedule(schedule, async () => {
        // Prevent overlapping job executions
        if (isJobRunning) {
            console.log('Slack notification job is already running, skipping this execution');
            return;
        }

        isJobRunning = true;
        const startTime = Date.now();

        try {
            console.log('=== Slack notification cron job started ===');
            const now = new Date();
            const date = now.toISOString().split('T')[0];
            const adjustedHour = now.getHours();
            const formattedHour = adjustedHour < 10 ? `0${adjustedHour}` : adjustedHour;

            console.log(`Fetching work shifts for date: ${date}, hour: ${formattedHour}`);

            const workShifts = await getWorkShiftByDateRange(date, formattedHour);

            if (!workShifts) {
                console.log('No work shifts found for this time period');
                return;
            }

            const tsCount = workShifts.tsMembers?.length || 0;
            const csCount = workShifts.csMembers?.length || 0;
            console.log(`Found ${tsCount} TS members and ${csCount} CS members`);

            const result = await sendNotificationsToTSMembers(workShifts);

            const duration = ((Date.now() - startTime) / 1000).toFixed(2);
            console.log(`=== Slack notification cron job completed in ${duration}s ===`);
            console.log(`Processed ${result.members?.length || 0} members successfully`);

        } catch (error) {
            console.error('Error in Slack notification cron job:', error.message);
            console.error('Stack trace:', error.stack);
        } finally {
            isJobRunning = false;
        }
    });

    console.log(`Slack notification cron job scheduled to run at ${schedule}`);
};

module.exports = {
    startSlackNotificationCron
}; 