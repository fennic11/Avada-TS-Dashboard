import { API_URL } from './apiConfig';

export const saveWorkShift = async (workShift) => {
    try {
        const response = await fetch(`${API_URL}/work-shift`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(workShift),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error saving work shift:', error);
        throw error;
    }
};

export const getWorkShift = async (date) => {
    try {
        const response = await fetch(`${API_URL}/work-shift?date=${date}`);

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Error getting work shift:', error);
        throw error;
    }
};

export const getKpiTsTeam = async (startDate, endDate) => {
    try {        
        const response = await fetch(`https://avada-crm.web.app/crm/api/v1/shifts/all/csv?start=${startDate}T17:00:00.000Z&end=${endDate}T23:59:00.000Z`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const csvText = await response.text();
        
        // Parse CSV data thành mảng (dựa trên workShiftService.js)
        const lines = csvText.trim().split('\n');
        
        if (lines.length === 0) {
            console.log('No data lines found');
            return [];
        }
        
        // Lấy headers từ dòng đầu tiên
        const headers = lines[0].split(',').map(h => h.replace(/"/g, '').trim());
        
        // Parse data rows
        const data = [];
        for (let i = 1; i < lines.length; i++) {
            const values = lines[i].split(',').map(v => v.replace(/"/g, '').trim());
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] || '';
            });
            
            data.push(row);
        }
        return data;
        
    } catch (error) {
        console.error('Error getting kpi ts team:', error);
        return [];
    }
};