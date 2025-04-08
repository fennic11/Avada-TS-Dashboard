const mongoose = require('mongoose');
const Card = require('../models/Card');
require('dotenv').config();

const removeDuplicateCards = async () => {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });
        console.log('✅ Connected to MongoDB');

        console.log('🔍 Starting duplicate card removal process...');
        
        // Find all cards grouped by cardUrl
        const duplicates = await Card.aggregate([
            {
                $group: {
                    _id: "$cardUrl",
                    count: { $sum: 1 },
                    docs: { $push: "$_id" }
                }
            },
            {
                $match: {
                    count: { $gt: 1 }
                }
            }
        ]);

        console.log(`📊 Found ${duplicates.length} card URLs with duplicates`);

        let totalRemoved = 0;
        for (const dup of duplicates) {
            // Keep the first document, remove others
            const [keepId, ...removeIds] = dup.docs;
            const result = await Card.deleteMany({
                _id: { $in: removeIds }
            });
            totalRemoved += result.deletedCount;
            console.log(`🗑️ Removed ${result.deletedCount} duplicates for card URL: ${dup._id}`);
        }

        console.log(`✅ Duplicate removal complete. Total cards removed: ${totalRemoved}`);
        console.log('📈 Summary:');
        console.log(`   - Total duplicate URLs found: ${duplicates.length}`);
        console.log(`   - Total cards removed: ${totalRemoved}`);

        // Disconnect from MongoDB
        await mongoose.disconnect();
        console.log('✅ Disconnected from MongoDB');
    } catch (error) {
        console.error('❌ Error:', error);
        process.exit(1);
    }
};

// Run the command
removeDuplicateCards(); 