import { differenceInMinutes, parseISO, compareAsc } from "date-fns";

export function calculateDevResolutionTime(actions) {
    console.log("🔍 Dev Actions:", actions);
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

    // Tìm action đầu tiên chuyển vào Waiting to fix (from dev)
    const moveToWaitingToFixAction = sortedActions.find(
        (action) =>
            action.type === "updateCard" &&
            action.data?.listAfter?.name === "Waiting to fix (from dev)"
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
        console.warn("❗ Không tìm thấy action tạo card");
        return null;
    }

    if (!moveToWaitingToFixAction) {
        console.warn("❗ Không tìm thấy action chuyển sang Waiting to fix (from dev)");
        return null;
    }

    if (!lastDueCompleteAction) {
        console.warn("❗ Không tìm thấy action mark done");
        return null;
    }

    const createTime = parseISO(createCardAction.date);
    const moveToWaitingToFixTime = parseISO(moveToWaitingToFixAction.date);
    const lastDueCompleteTime = parseISO(lastDueCompleteAction.date);

    if (isNaN(createTime) || isNaN(moveToWaitingToFixTime) || isNaN(lastDueCompleteTime)) {
        console.warn("❗ Lỗi định dạng thời gian:", {
            createTime,
            moveToWaitingToFixTime,
            lastDueCompleteTime
        });
        return null;
    }

    // First Actions Time: từ lúc create card tới khi kéo sang cột Waiting to fix (from dev)
    const firstActionTime = Number(differenceInMinutes(moveToWaitingToFixTime, createTime));
    
    // Dev Resolution Time: từ lúc kéo sang cột Waiting to fix (from dev) đến khi mark done
    const devResolutionTime = Number(differenceInMinutes(lastDueCompleteTime, moveToWaitingToFixTime));
    
    // Resolution Time: từ lúc create Card tới khi mark done
    const resolutionTime = Number(differenceInMinutes(lastDueCompleteTime, createTime));

    console.log("📊 Dev Resolution Time Metrics:", {
        firstActionTime: `${firstActionTime} minutes`,
        devResolutionTime: `${devResolutionTime} minutes`,
        resolutionTime: `${resolutionTime} minutes`
    });

    return {
        resolutionTime: resolutionTime,
        devResolutionTime: devResolutionTime,
        firstActionTime: firstActionTime
    };
}
