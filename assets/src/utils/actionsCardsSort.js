// Sắp xếp các actions theo timeline (tăng dần theo date)
export function sortActionsByTimeline(actions) {
    if (!Array.isArray(actions)) return [];
    return [...actions].sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return new Date(a.date) - new Date(b.date);
    });
}
