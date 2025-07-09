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
        const lines = csvText.split('\n');
        const headers = lines[0].split(',');
        const data = lines.slice(1).map(line => {
            const values = line.split(',');
            return headers.reduce((acc, header, index) => {
                acc[header] = values[index];
                return acc;
            }, {});
        });
        return data;
        } catch (error) {
        console.error('Error getting kpi ts team:', error);
        return [];
    }
};