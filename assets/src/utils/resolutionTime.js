import { differenceInMinutes, parseISO, compareAsc } from "date-fns";

export function calculateResolutionTime(actions) {
    console.log("🔍 Actions:", actions);
    if (!actions || actions.length === 0) {
        console.log("❌ Không có actions để tính thời gian");
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
        console.log("❌ Không tìm thấy action tạo card");
        return null;
    }

    if (!moveToDoingAction) {
        console.log("❌ Không tìm thấy action chuyển vào Doing (Inshift)");
        return null;
    }

    if (!lastDueCompleteAction) {
        console.log("❌ Không tìm thấy action đánh dấu dueComplete");
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

    console.log(`⏱️ Thời gian từ lúc tạo card đến khi chuyển vào Doing: ${firstActionTime} phút`);
    console.log(`⏱️ Thời gian từ lúc chuyển vào Doing đến khi hoàn thành: ${resolutionTime} phút`);
    console.log(`⏱️ Tổng thời gian từ lúc tạo card đến khi hoàn thành: ${totalResolutionTime} phút`);
    console.log(`📅 Thời gian tạo card: ${createTime}`);
    console.log(`📅 Thời gian chuyển vào Doing: ${moveToDoingTime}`);
    console.log(`📅 Thời gian hoàn thành: ${lastDueCompleteTime}`);

    return {
        resolutionTime: totalResolutionTime,
        TSResolutionTime: resolutionTime,
        firstActionTime: firstActionTime
    };
}
