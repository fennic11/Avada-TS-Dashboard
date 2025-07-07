const WorkShift = require('../models/WorkShift');
const members = require('../slackIdsConfig.json');


const createWorkShift = async (workShift) => {
    const newWorkShift = new WorkShift(workShift);
    await newWorkShift.save();
    return newWorkShift;
};

const getWorkShift = async (date) => {
    const workShift = await WorkShift.findOne({ date });
    return workShift;
};

const updateWorkShift = async (date, workShift) => {
    const updatedWorkShift = await WorkShift.findOneAndUpdate({ date }, workShift, { new: true });
    return updatedWorkShift;
};

const getWorkShiftByDateRange = async (startDate, adjustedHour) => {
    try {
        console.log(`Fetching work shifts from ${startDate}`);
        
        const response = await fetch(`https://avada-crm.web.app/crm/api/v1/shifts/all/csv?start=${startDate}T${adjustedHour}:00:00.000Z&end=${startDate}T23:59:00.000Z`);
        console.log('response', response);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        console.log('Raw CSV data:', csvText.substring(0, 500) + '...'); // Log first 500 chars
        
        // Parse CSV data thành mảng
        const lines = csvText.trim().split('\n');
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.replace(/"/g, '')); 
            data.push(values);
        }
        
        console.log('Sample data:', data.slice(0, 3));
        
        // Filter và tạo 2 mảng tsMembers và csMembers
        const tsMembers = [];
        const csMembers = [];
        
        data.forEach(row => {
            const name = row[7]; // Name column
            const email = row[6]; // Email column
            
            // Tìm trong slackIdsConfig.json
            const member = members.find(m => m.email === email);
            
            if (member) {
                const memberInfo = {
                    slackId: member.slackId,
                    trelloId: member.id,
                    name: name,
                    email: email,
                    role: member.role,
                    group: member.group
                };
                
                if (member.role === 'TS') {
                    tsMembers.push(memberInfo);
                } else if (member.role === 'CS') {
                    csMembers.push(memberInfo);
                }
            }
        });
        
        console.log(`Found ${tsMembers.length} TS members and ${csMembers.length} CS members`);
        
        return {
            tsMembers,
            csMembers
        };
    } catch (error) {
        console.error('Error fetching work shifts:', error);
        throw error;
    }
};

module.exports = {
    createWorkShift,
    getWorkShift,
    updateWorkShift,
    getWorkShiftByDateRange
};