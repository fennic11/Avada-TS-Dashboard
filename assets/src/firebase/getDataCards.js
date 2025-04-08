import { collection, getDocs, query, where, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export const getResolutionTimes = async (startDate, endDate) => {
    try {
        const start = Timestamp.fromDate(new Date(startDate));
        const end = Timestamp.fromDate(new Date(endDate));

        const q = query(
            collection(db, "resolutionTimes"),
            where("createdAt", ">=", start),
            where("createdAt", "<=", end)
        );

        const querySnapshot = await getDocs(q);
        const results = [];
        querySnapshot.forEach((doc) => {
            results.push({ id: doc.id, ...doc.data() });
        });
        return results;
    } catch (error) {
        console.error("❌ Lỗi khi lấy dữ liệu từ Firestore theo ngày:", error);
        return [];
    }
};
