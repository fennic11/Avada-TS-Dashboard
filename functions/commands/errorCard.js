const mongoose = require('mongoose');
const ErrorCard = require('../models/ErrorCard');
const connectDB = require('../config/db');

async function updateErrorCardFields() {
    try {
        // Connect to database
        await connectDB();
        console.log('✅ Connected to database');

        // Update all ErrorCard documents that don't have status or requestText fields
        const updateResult = await ErrorCard.updateMany(
            {
                $or: [
                    { status: { $exists: false } },
                    { requestText: { $exists: false } }
                ]
            },
            {
                $set: {
                    status: 'approved', // Default status
                    requestText: ''     // Default empty requestText
                }
            }
        );

        console.log(`✅ Updated ${updateResult.modifiedCount} ErrorCard documents`);
        console.log(`📊 Matched ${updateResult.matchedCount} documents`);

        // Verify the update by counting documents with the new fields
        const countWithStatus = await ErrorCard.countDocuments({ status: { $exists: true } });
        const countWithRequestText = await ErrorCard.countDocuments({ requestText: { $exists: true } });
        const totalDocuments = await ErrorCard.countDocuments();

        console.log(`📈 Verification:`);
        console.log(`   - Total documents: ${totalDocuments}`);
        console.log(`   - Documents with status field: ${countWithStatus}`);
        console.log(`   - Documents with requestText field: ${countWithRequestText}`);

        if (countWithStatus === totalDocuments && countWithRequestText === totalDocuments) {
            console.log('🎉 All ErrorCard documents now have status and requestText fields!');
        } else {
            console.log('⚠️  Some documents may still be missing the new fields');
        }

    } catch (error) {
        console.error('❌ Error updating ErrorCard fields:', error);
    } finally {
        // Close database connection
        await mongoose.connection.close();
        console.log('🔌 Database connection closed');
    }
}

// Run the update if this file is executed directly
if (require.main === module) {
    updateErrorCardFields()
        .then(() => {
            console.log('✅ Update completed successfully');
            process.exit(0);
        })
        .catch((error) => {
            console.error('❌ Update failed:', error);
            process.exit(1);
        });
}

module.exports = { updateErrorCardFields };
