const { createConversation, addNoteToConversation } = require('../services/crispService');

const createConversationController = async (req, res) => {
    const { note } = req.body;
    console.log(note);
    const conversation = await createConversation();
    // if (conversation.status === 200) {
    //     const data = await addNoteToConversation(conversation.session_id, note);
    //     res.status(200).json(data);
    // } else {
    //     res.status(500).json({ message: 'Failed to create conversation' });
    // }
}

module.exports = {
    createConversationController
}