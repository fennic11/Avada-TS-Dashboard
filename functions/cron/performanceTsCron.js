const cron = require('node-cron');  
const members = require('../slackIdsConfig.json');
const { getBoardActionsByMemberAndDate, getCardsByList } = require('../services/trelloService');
const { sendMessageToChannel } = require('../services/slackService');
const schedule = '59 * * * *';

const reportWorkShift = () => {
    console.log('Report work shift cron job...');
    cron.schedule(schedule, async () => {
        try {
            console.log('Report work shift cron job running...');
            
            // Calculate time range: 1 hour ago until now (accounting for 7-hour time difference in production)
            const now = new Date();
            
            const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
            
            // Adjust for 7-hour time difference in production
            const timeZoneOffset = 7 * 60 * 60 * 1000; // 7 hours in milliseconds
            const adjustedNow = new Date(now.getTime() + timeZoneOffset);
            const adjustedOneHourAgo = new Date(oneHourAgo.getTime() + timeZoneOffset);
            
            const since = adjustedOneHourAgo.toISOString();
            const before = adjustedNow.toISOString();
            
            console.log(`Time range: ${since} to ${before}`);
            
            const actions = await getBoardActionsByMemberAndDate(since, before);
            console.log('actions', actions.length);
            
            // Get cards from Pending and Doing lists
            const pendingCards = await getCardsByList(process.env.PENDING_CARD_LIST_ID);
            const doingCards = await getCardsByList(process.env.DOING_CARD_LIST_ID);
            
            // Combine cards into one array
            const pendingAndDoingCards = [...pendingCards, ...doingCards];
            
            // Filter and analyze actions
            const message = filterActionsAndCards(actions, pendingAndDoingCards);
            await sendMessageToChannel(message, 'TS-SHIFT-REPORT-2');
        } catch (error) {
            console.error('Error in Report work shift cron job:', error);
        }
    });
    console.log(`Report work shift cron job scheduled to run at ${schedule}`);
};

const filterActionsAndCards = (actions, cards) => {
    // Filter members with role TS
    const tsMembers = members.filter(member => member.role === 'TS');
    
    // Create a map of member IDs for quick lookup
    const tsMemberIds = new Set(tsMembers.map(member => member.id));
    
    // Filter actions by TS members
    const tsActions = actions.filter(action => {
        return action.memberCreator && tsMemberIds.has(action.memberCreator.id);
    });
    
    // Count total actions
    const totalActions = tsActions.length;
    
    // Count completed cards (cards in Doing list with dueComplete = true)
    const completedCards = cards.filter(card => {
        return card.idList === process.env.DOING_CARD_LIST_ID && 
               card.dueComplete === true;
    }).length;
    
    // Count TS members who have actions
    const activeTSMembers = new Set();
    tsActions.forEach(action => {
        if (action.memberCreator && action.memberCreator.id) {
            activeTSMembers.add(action.memberCreator.id);
        }
    });
    
    // Process cards and group by members
    const memberCards = {};
    cards.forEach(card => {
        // Determine card status
        let status = 'pending';
        if (card.idList === process.env.DOING_CARD_LIST_ID) {
            status = card.dueComplete ? 'completed' : 'process';
        }
        
        // Get card members
        const cardMembers = card.idMembers || [];
        cardMembers.forEach(memberId => {
            const member = tsMembers.find(m => m.id === memberId);
            if (member) {
                const memberName = member.fullName;
                if (!memberCards[memberName]) {
                    memberCards[memberName] = {
                        pending: 0,
                        process: 0,
                        completed: 0
                    };
                }
                memberCards[memberName][status]++;
            }
        });
    });
    
    // Create simple text message
    let message = `📊 *Báo cáo hoạt động TS Team (1 giờ qua) <!channel>*\n\n`;
    message += `• Tổng số actions: *${totalActions}*\n`;
    message += `• Cards hoàn thành: *${completedCards}*\n`;
    message += `• Số TS members có hoạt động: *${activeTSMembers.size}*\n\n`;
    
    // Add member details if there are actions or cards
    if (tsActions.length > 0 || Object.keys(memberCards).length > 0) {
        const memberStats = {};
        
        // Process actions if any
        if (tsActions.length > 0) {
            tsActions.forEach(action => {
                const memberId = action.memberCreator.id;
                const member = tsMembers.find(m => m.id === memberId);
                const memberName = member ? member.fullName : 'Unknown';
                
                if (!memberStats[memberName]) {
                    memberStats[memberName] = { 
                        actions: 0, 
                        latestAction: null 
                    };
                }
                
                memberStats[memberName].actions++;
                
                // Track latest action for each member
                if (!memberStats[memberName].latestAction || 
                    new Date(action.date) > new Date(memberStats[memberName].latestAction.date)) {
                    memberStats[memberName].latestAction = action;
                }
            });
        }
        
        // Add members who have cards but no actions
        Object.keys(memberCards).forEach(memberName => {
            if (!memberStats[memberName]) {
                memberStats[memberName] = { 
                    actions: 0, 
                    latestAction: null 
                };
            }
        });
        
        message += `*Chi tiết theo từng member:*\n`;
        Object.entries(memberStats).forEach(([name, stats]) => {
            const latestTime = stats.latestAction ? 
                new Date(stats.latestAction.date).toLocaleString('vi-VN') : 'Không có';
            
            // Get card status for this member
            const cardStatus = memberCards[name] || { pending: 0, process: 0, completed: 0 };
            
            message += `• *${name}*: ${stats.actions} actions, Actions cuối cùng lúc: *${latestTime}*\n`;
            message += `  📋 Cards: Pending(${cardStatus.pending}) | Process(${cardStatus.process}) | Completed(${cardStatus.completed})\n`;
            
            // Add warning message for inactive members with pending/process cards
            if (stats.actions === 0 && (cardStatus.pending > 0 || cardStatus.process > 0)) {
                message += `  ⚠️ *Bạn này 1 tiếng rồi không active công việc*\n`;
            }
        });
    } else {
        message += `*Không có hoạt động nào trong 1 giờ qua*`;
    }
    
    return message;
};

module.exports = {
    reportWorkShift
}