const Card = require('../models/Card');
const firebaseDataService = require('./firebaseDataService');

const createOrUpdateCard = async (cardData) => {
    try {
        const {cardId, cardUrl, cardName, description, labels, members, resolutionTime, resolutionTimeTS, firstActionTime, createdAt } = cardData;

        console.log('🔄 Processing card:');
        console.log('   - Card URL:', cardUrl);
        console.log('   - Card Name:', cardName);
        console.log('   - Resolution Time:', resolutionTime);

        // Use findOneAndUpdate with upsert option
        const card = await Card.findOneAndUpdate(
            { cardId }, // find criteria
            {
                cardId,
                cardName: cardName,
                cardUrl,
                description,
                labels,
                members,
                resolutionTime,
                resolutionTimeTS: resolutionTimeTS,
                firstActionTime,
                createdAt
            },
            {
                new: true,
                upsert: true, // Create if doesn't exist
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        console.log('✅ Card processed successfully');
        return card;
    } catch (error) {
        if (error.code === 11000) {
            console.error('❌ Duplicate key error - Card with this URL already exists');
        } else {
            console.error('❌ Error in createOrUpdateCard service:', error);
        }
        throw error;
    }
};

const getAllCards = async (startDate, endDate) => {
    try {
        console.log('📊 Fetching cards from:', startDate, 'to:', endDate);
        const cards = await Card.find({
            createdAt: {
                $gte: startDate,
                $lte: endDate
            }
        }).sort({ createdAt: -1 });
        console.log(`📦 Found ${cards.length} cards`);
        return cards;
    } catch (error) {
        console.error('❌ Error in getAllCards service:', error);
        throw error;
    }
};

const getCardByUrl = async (cardUrl) => {
    try {
        console.log('🔍 Looking up card with URL:', cardUrl);
        const card = await Card.findOne({ cardUrl });
        if (card) {
            console.log('✅ Card found');
        } else {
            console.log('⚠️ Card not found');
        }
        return card;
    } catch (error) {
        console.error('❌ Error in getCardByUrl service:', error);
        throw error;
    }
};

const pushCardToFirebase = async (cardData) => {
    try {
        // Handle both old and new data formats
        const { 
            id, name, shortUrl, labels, idBoard, createAt, idMemberCreator,
        } = cardData;

        // Use new format fields or fallback to legacy fields
        const cardIdFinal = id ;
        const cardNameFinal = name;
        const cardUrlFinal = shortUrl;
        const createdAtFinal = createAt || new Date();
        const memberCreatorFinal = idMemberCreator;

        console.log('🔥 Pushing card to Firebase:');
        console.log('   - Card ID:', cardIdFinal);
        console.log('   - Card URL:', cardUrlFinal);
        console.log('   - Card Name:', cardNameFinal);
        console.log('   - Created At:', createdAtFinal);
        console.log('   - Member Creator:', memberCreatorFinal);

        // Prepare data for Firebase - only essential fields
        const firebaseData = {
            id: cardIdFinal,
            name: cardNameFinal,
            shortUrl: cardUrlFinal,
            labels: labels || [],
            idBoard: idBoard,
            createAt: createdAtFinal,
            idMemberCreator: memberCreatorFinal
        };

        // Use cardId as document ID for consistency
        const docId = await firebaseDataService.pushDataWithId('cards', cardIdFinal, firebaseData);

        console.log('✅ Card pushed to Firebase successfully with ID:', docId);
        return docId;
    } catch (error) {
        console.error('❌ Error in pushCardToFirebase service:', error);
        throw error;
    }
};

const pushCardsToFirebase = async (cardsArray) => {
    try {
        console.log(`🔥 Batch pushing ${cardsArray.length} cards to Firebase`);

        const firebaseDataArray = cardsArray.map(card => {
            // Handle both old and new data formats
            const { 
                id, name, shortUrl, labels, idBoard, createAt, idMemberCreator,

            } = card;

            // Use new format fields or fallback to legacy fields
            const cardIdFinal = id;
            const cardNameFinal = name ;
            const cardUrlFinal = shortUrl ;
            const createdAtFinal = createAt || new Date();
            const memberCreatorFinal = idMemberCreator;
            
            return {
                id: cardIdFinal,
                name: cardNameFinal,
                shortUrl: cardUrlFinal,
                labels: labels || [],
                idBoard: idBoard,
                createAt: createdAtFinal,
                idMemberCreator: memberCreatorFinal
            };
        });

        const results = await firebaseDataService.batchPush('cards', firebaseDataArray);

        console.log(`✅ Successfully pushed ${results.length} cards to Firebase`);
        return results;
    } catch (error) {
        console.error('❌ Error in pushCardsToFirebase service:', error);
        throw error;
    }
};

const syncCardToFirebase = async (cardData) => {
    try {
        console.log('🔄 Syncing card to both MongoDB and Firebase');
        
        // First, save to MongoDB
        const mongoCard = await createOrUpdateCard(cardData);
        
        // Then, push to Firebase
        const firebaseId = await pushCardToFirebase(cardData);
        
        console.log('✅ Card synced successfully to both databases');
        return {
            mongoCard,
            firebaseId,
            success: true
        };
    } catch (error) {
        console.error('❌ Error in syncCardToFirebase service:', error);
        throw error;
    }
};

module.exports = {
    createOrUpdateCard,
    getAllCards,
    getCardByUrl,
    pushCardToFirebase,
    pushCardsToFirebase,
    syncCardToFirebase
};
