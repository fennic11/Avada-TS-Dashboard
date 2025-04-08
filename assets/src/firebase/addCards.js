// src/saveCardToFirebase.js
import { collection, addDoc } from "firebase/firestore";
import { db } from "./firebase";

// cardData gồm: cardName, cardUrl, labels, resolutionTime, members, createdAt
export const saveCardToFirebase = async (cardData) => {
    try {
        await addDoc(collection(db, "resolutionTimes"), {
            ...cardData,
            createdAt: new Date(cardData.createdAt), // đảm bảo lưu đúng kiểu timestamp
        });
        console.log(`✅ Đã lưu card: ${cardData.cardName}`);
    } catch (error) {
        console.error("❌ Lỗi khi lưu vào Firebase:", error);
    }
};

