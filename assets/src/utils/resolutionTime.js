import { differenceInMinutes, parseISO, compareAsc } from "date-fns";

export function calculateResolutionTime(actions) {
    if (!actions || actions.length === 0) {
        console.log("❌ Không có actions để tính thời gian");
        return null;
    }

    // Sắp xếp actions theo thời gian tăng dần (từ cũ đến mới)
    const sortedActions = [...actions].sort((a, b) =>
        compareAsc(parseISO(a.date), parseISO(b.date))
    );
    const firstAction = sortedActions[0];


    // Lấy action chuyển từ "New Issues"
    const moveFromNewIssuesAction = sortedActions.find(
        (action) =>
            action.type === "updateCard" &&
            action.data?.listBefore?.name?.toLowerCase() === "new issues"
    );

    // Comment chứa từ "done issue"
    const doneAction = sortedActions.find(
        (action) =>
            action.type === "commentCard" &&
            action.data?.text?.toLowerCase().includes("done issue")
    );

    if (!moveFromNewIssuesAction) {
        console.log("❌ Không tìm thấy action chuyển vào Doing (Inshift)");
        return null;
    }

    if (!doneAction) {
        console.log("❌ Không tìm thấy comment 'done issue'");
        return null;
    }

    if (!firstAction) {
        console.log("❌ Không tìm thấy action đầu tiên");
        return null;
    }

    const createTime = parseISO(firstAction.date);
    const doneTime = parseISO(doneAction.date);
    const newIssuesTime = moveFromNewIssuesAction ? parseISO(moveFromNewIssuesAction.date) : null;

    if (isNaN(newIssuesTime) || isNaN(doneTime) || isNaN(createTime)) {
        console.warn("❗ Lỗi định dạng thời gian:", {
            doneTime,
            firstActionDate: firstAction.date,
            newIssuesTime: newIssuesTime.date,
            doneActionDate: doneAction.date
        });
        return null;
    }

    const diffResolutionTimeTS = Number(differenceInMinutes(doneTime, newIssuesTime));
    const diffResolutionTimeTSTeam = Number(differenceInMinutes(doneTime, createTime));
    const diffFirstActionTimeTS = Number(differenceInMinutes(newIssuesTime, createTime));

    console.log(`⏱️ Time from Create Card to 'Done issue': ${diffResolutionTimeTSTeam} minutes`);
    console.log(`⏱️ Time from 'Doing (Inshift)' to 'Done issue': ${diffResolutionTimeTS} minutes`);
    console.log(`⏱️ Time from Create card to First Action: ${diffFirstActionTimeTS} minutes`);

    return {
        resolutionTime: diffResolutionTimeTSTeam,
        TSResolutionTime: diffResolutionTimeTS,
        firstActionTime: diffFirstActionTimeTS
    };
}
