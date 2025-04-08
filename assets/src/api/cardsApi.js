export const postCards = async (cardData) => {
    try {
        console.log('Data before posting:', cardData);
        const response = await fetch('http://localhost:5000/api/cards', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(cardData),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.details || 'Failed to post card');
        }

        const result = await response.json();
        console.log('Response from server:', result);
        
        // Ensure we return the complete data
        if (!result || Object.keys(result).length === 0) {
            throw new Error('Empty response from server');
        }

        console.log('✅ Card posted successfully:', result);
        return result;
    } catch (error) {
        console.error('❌ Error posting card:', error);
        throw error;
    }
};

export const getResolutionTimes = async (startDate, endDate) => {
    try {
        const response = await fetch(`http://localhost:5000/api/cards?start=${startDate}&end=${endDate}`);
        if (!response.ok) {
            throw new Error("Không thể lấy dữ liệu từ API");
        }

        const data = await response.json();
        console.log(data[0])

        return data;
    } catch (err) {
        console.error("❌ Lỗi khi gọi API:", err);
        return [];
    }
};


