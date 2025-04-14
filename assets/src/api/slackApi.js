const SLACK_WEBHOOK_URL = process.env.REACT_APP_SLACK_WEBHOOK_URL;

/**
 * Send a simple text message to Slack
 * @param {string} message - The message text to send
 * @returns {Promise} - Response from Slack API
 */
export const sendSlackMessage = async (message) => {
    try {
        const response = await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ text: message })
        });

        if (!response.ok) {
            throw new Error(`Failed to send Slack message: ${response.status} ${response.statusText}`);
        }

        return response;
    } catch (error) {
        console.error('Error sending Slack message:', error);
        throw error;
    }
};

/**
 * Send a formatted message to Slack with blocks
 * @param {Object} params - Message parameters
 * @param {string} params.title - Message title/header
 * @param {string} params.text - Main message text
 * @param {string} params.color - Color of the message (hex code or 'good', 'warning', 'danger')
 * @param {Array} params.fields - Additional fields to display
 * @param {string} params.cardUrl - URL to the Trello card
 * @returns {Promise} - Response from Slack API
 */
export const sendFormattedSlackMessage = async ({ title, text, color = 'good', fields = [], cardUrl }) => {
    try {
        const blocks = [
            {
                type: "header",
                text: {
                    type: "plain_text",
                    text: title,
                    emoji: true
                }
            },
            {
                type: "section",
                text: {
                    type: "mrkdwn",
                    text: text
                }
            }
        ];

        // Add fields if provided
        if (fields.length > 0) {
            blocks.push({
                type: "section",
                fields: fields.map(field => ({
                    type: "mrkdwn",
                    text: `*${field.title}*\n${field.value}`
                }))
            });
        }

        // Add card link if provided
        if (cardUrl) {
            blocks.push({
                type: "context",
                elements: [
                    {
                        type: "mrkdwn",
                        text: `<${cardUrl}|View in Trello>`
                    }
                ]
            });
        }

        const message = {
            blocks,
            attachments: [
                {
                    color: color,
                    blocks: []
                }
            ]
        };

        const response = await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message)
        });

        if (!response.ok) {
            throw new Error(`Failed to send Slack message: ${response.status} ${response.statusText}`);
        }

        return response;
    } catch (error) {
        console.error('Error sending formatted Slack message:', error);
        throw error;
    }
};

/**
 * Send a notification about a new card/issue
 * @param {Object} card - Card data
 * @returns {Promise} - Response from Slack API
 */
export const sendNewCardNotification = async (card) => {
    const { name, desc, shortUrl, labels = [] } = card;
    
    return sendFormattedSlackMessage({
        title: "🆕 New Issue Created",
        text: `*${name}*\n${desc || 'No description provided'}`,
        color: "#36a64f",
        fields: [
            {
                title: "Labels",
                value: labels.length > 0 ? labels.map(l => l.name).join(", ") : "No labels"
            }
        ],
        cardUrl: shortUrl
    });
};

/**
 * Send a notification about card updates
 * @param {Object} card - Card data
 * @param {string} updateType - Type of update
 * @param {Object} updateData - Additional update data
 * @returns {Promise} - Response from Slack API
 */
export const sendCardUpdateNotification = async (card, updateType, updateData = {}) => {
    const { name, shortUrl } = card;
    let title, text, color;

    switch (updateType) {
        case 'comment':
            title = "💬 New Comment";
            text = `*On card:* ${name}\n*Comment:* ${updateData.comment}`;
            color = "#3AA3E3";
            break;
        case 'status':
            title = "🔄 Status Changed";
            text = `*Card:* ${name}\n*New Status:* ${updateData.newStatus}`;
            color = "#ECB22E";
            break;
        case 'member':
            title = "👤 Member Update";
            text = `*Card:* ${name}\n*${updateData.action}:* ${updateData.memberName}`;
            color = "#E01E5A";
            break;
        default:
            title = "🔔 Card Updated";
            text = `*Card:* ${name}`;
            color = "#2EB67D";
    }

    return sendFormattedSlackMessage({
        title,
        text,
        color,
        cardUrl: shortUrl
    });
};

/**
 * Example of sending a notification about a card to Slack
 * @param {Object} params
 * @param {string} params.cardName - Name of the card
 * @param {string} params.cardUrl - URL of the card
 * @param {string} params.description - Description of the update
 * @param {string} params.author - Name of the person making the update
 * @returns {Promise}
 */
export const sendCardNotificationExample = async ({ cardName, cardUrl, description, author }) => {
    try {
        const message = {
            blocks: [
                {
                    type: "header",
                    text: {
                        type: "plain_text",
                        text: "🔔 Card Update Notification",
                        emoji: true
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: `*Card:* <${cardUrl}|${cardName}>`
                    }
                },
                {
                    type: "section",
                    text: {
                        type: "mrkdwn",
                        text: description
                    }
                },
                {
                    type: "context",
                    elements: [
                        {
                            type: "mrkdwn",
                            text: `Updated by *${author}* at ${new Date().toLocaleString()}`
                        }
                    ]
                },
                {
                    type: "divider"
                }
            ]
        };

        const response = await fetch(SLACK_WEBHOOK_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(message)
        });

        if (!response.ok) {
            throw new Error(`Failed to send Slack message: ${response.status} ${response.statusText}`);
        }

        return response;
    } catch (error) {
        console.error('Error sending card notification:', error);
        throw error;
    }
};
