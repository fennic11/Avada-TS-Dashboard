import { differenceInMinutes, parseISO, compareAsc } from "date-fns";

export function calculateResolutionTime(actions) {
    console.log("🔍 Actions:", actions);
    if (!actions || actions.length === 0) {
        return null;
    }

    // Sắp xếp actions theo thời gian tăng dần (từ cũ đến mới)
    const sortedActions = [...actions].sort((a, b) =>
        compareAsc(parseISO(a.date), parseISO(b.date))
    );

    // Tìm action tạo card đầu tiên
    const createCardAction = sortedActions.find(
        (action) => action.type === "createCard"
    );

    // Tìm action đầu tiên chuyển vào Doing (Inshift)
    const moveToDoingAction = sortedActions.find(
        (action) =>
            action.type === "updateCard" &&
            action.data?.listAfter?.name === "Doing (Inshift)"
    );

    // Tìm action cuối cùng đánh dấu dueComplete
    const lastDueCompleteAction = [...sortedActions]
        .reverse()
        .find(
            (action) =>
                action.type === "updateCard" &&
                action.data?.card?.dueComplete === true
        );

    if (!createCardAction) {
        return null;
    }

    if (!moveToDoingAction) {
        return null;
    }

    if (!lastDueCompleteAction) {
        return null;
    }

    const createTime = parseISO(createCardAction.date);
    const moveToDoingTime = parseISO(moveToDoingAction.date);
    const lastDueCompleteTime = parseISO(lastDueCompleteAction.date);

    if (isNaN(createTime) || isNaN(moveToDoingTime) || isNaN(lastDueCompleteTime)) {
        console.warn("❗ Lỗi định dạng thời gian:", {
            createTime,
            moveToDoingTime,
            lastDueCompleteTime
        });
        return null;
    }

    const firstActionTime = Number(differenceInMinutes(moveToDoingTime, createTime));
    const resolutionTime = Number(differenceInMinutes(lastDueCompleteTime, moveToDoingTime));
    const totalResolutionTime = Number(differenceInMinutes(lastDueCompleteTime, createTime));

    return {
        resolutionTime: totalResolutionTime,
        TSResolutionTime: resolutionTime,
        firstActionTime: firstActionTime
    };
}
