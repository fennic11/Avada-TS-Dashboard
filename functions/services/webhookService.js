const key = process.env.TRELLO_API_KEY;
const token = process.env.TRELLO_TOKEN;

const createWebhook = async () => {
    const resp = await fetch(`https://api.trello.com/1/tokens/${token}/webhooks?key=${key}`, {
        headers: {
            Accept: "application/json"
        },
        method: "POST",
        body: JSON.stringify({
            description: "Webhook for card creation",
            callbackURL: "https://avada-ts-dashboard-production.up.railway.app/webhook",
            idModel: "5f4d2b3a5d4c3b2a1d0c9b8a79685746",
            events: ["createCard"]
        })
    });
}

const receiveWebhook = async (req, res) => {
    console.log(req.body);
    res.status(200).json({ message: "Webhook received" });
}

module.exports = {
    createWebhook,
    receiveWebhook
}
