/**
 * Check if cards have been in "Waiting for Customer's Confirmation (SLA: 2 days)" 
 * for more than 2 days without any other actions
 * @param {Array} allActions - Array of all card actions
 * @returns {Array} Array of cards that are overdue in the confirmation column
 */
export function checkOverdueConfirmationCards(allActions) {
    if (!allActions || !Array.isArray(allActions)) {
        return [];
    }

    const WAITING_CONFIRMATION_LIST_ID = "63f489b961f3a274163459a2"; // "Waiting for Customer's Confirmation (SLA: 2 days)"
    const SLA_DAYS = 2;
    const SLA_MILLISECONDS = SLA_DAYS * 24 * 60 * 60 * 1000; // 2 days in milliseconds

    // Group actions by card ID
    const cardActions = {};
    allActions.forEach(action => {
        if (!cardActions[action.cardId]) {
            cardActions[action.cardId] = [];
        }
        cardActions[action.cardId].push(action);
    });

    const overdueCards = [];

    // Check each card
    Object.keys(cardActions).forEach(cardId => {
        const actions = cardActions[cardId];
        
        // Sort actions by date (newest first)
        actions.sort((a, b) => new Date(b.date) - new Date(a.date));

        // Find the most recent action that moved the card to "Waiting for Customer's Confirmation"
        let lastMovedToConfirmation = null;
        
        for (let i = 0; i < actions.length; i++) {
            const action = actions[i];
            
            // Check if this action moved the card to the confirmation column
            if (action.type === 'updateCard' && 
                action.data && 
                action.data.listAfter && 
                action.data.listAfter.id === WAITING_CONFIRMATION_LIST_ID) {
                lastMovedToConfirmation = action;
                break;
            }
        }

        // If we found when the card was moved to confirmation column
        if (lastMovedToConfirmation) {
            const movedToConfirmationDate = new Date(lastMovedToConfirmation.date);
            const now = new Date();
            const timeInConfirmation = now - movedToConfirmationDate;

            // Check if it's been more than 2 days
            if (timeInConfirmation > SLA_MILLISECONDS) {
                // Check if there have been any actions after moving to confirmation
                const actionsAfterConfirmation = actions.filter(action => 
                    new Date(action.date) > movedToConfirmationDate
                );

                // Check if any of these actions moved the card away from confirmation
                const movedAwayFromConfirmation = actionsAfterConfirmation.some(action => 
                    action.type === 'updateCard' && 
                    action.data && 
                    action.data.listAfter && 
                    action.data.listAfter.id !== WAITING_CONFIRMATION_LIST_ID
                );

                // If the card hasn't been moved away from confirmation, it's overdue
                if (!movedAwayFromConfirmation) {
                    overdueCards.push({
                        cardId: cardId,
                        cardName: lastMovedToConfirmation.data?.card?.name || 'Unknown Card',
                        movedToConfirmationDate: movedToConfirmationDate,
                        daysOverdue: Math.floor(timeInConfirmation / (24 * 60 * 60 * 1000)) - SLA_DAYS,
                        errorMessage: "Đã kéo sang cột Waiting for Customer's Confirmation (SLA: 2 days) quá 2 ngày",
                        lastAction: lastMovedToConfirmation
                    });
                }
            }
        }
    });

    return overdueCards;
}

/**
 * Get a summary of overdue confirmation cards
 * @param {Array} allActions - Array of all card actions
 * @returns {Object} Summary statistics
 */
export function getOverdueConfirmationSummary(allActions) {
    const overdueCards = checkOverdueConfirmationCards(allActions);
    
    return {
        totalOverdue: overdueCards.length,
        cards: overdueCards,
        summary: overdueCards.length > 0 
            ? `Có ${overdueCards.length} card(s) đã quá hạn trong cột Waiting for Customer's Confirmation`
            : "Không có card nào quá hạn trong cột Waiting for Customer's Confirmation"
    };
}
