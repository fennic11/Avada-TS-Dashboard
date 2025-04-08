import React from "react";
import { Box, Typography } from "@mui/material";

const TimeToDoneBox = ({ diffMinutes, title }) => {
    const isValid =
        typeof diffMinutes === "number" && !isNaN(diffMinutes);

    if (!isValid) {
        return (
            <Box
                sx={{
                    backgroundColor: "#f5f5f5",
                    color: "text.secondary",
                    padding: 1.5,
                    borderRadius: 2,
                    borderLeft: "6px solid gray",
                    display: "inline-block",
                }}
            >
                <Typography variant="body2" fontWeight="bold" noWrap>
                    {title}: Chưa có thời gian
                </Typography>
            </Box>
        );
    }

    let bgColor = "#d0f0c0"; // xanh lá nhạt
    let borderColor = "green";
    let textColor = "inherit";

    if (diffMinutes >= 60 && diffMinutes < 480) {
        bgColor = "#fff3cd"; // vàng nhạt
        borderColor = "goldenrod";
    } else if (diffMinutes >= 480 && diffMinutes < 1440) {
        bgColor = "#f8d7da"; // đỏ nhạt
        borderColor = "crimson";
    } else if (diffMinutes >= 1440) {
        bgColor = "#dc3545"; // đỏ đậm
        borderColor = "darkred";
        textColor = "#fff";
    }

    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    const formattedTime =
        hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

    return (
        <Box
            sx={{
                backgroundColor: bgColor,
                color: textColor,
                padding: 1.5,
                borderRadius: 2,
                borderLeft: "6px solid",
                borderColor: borderColor,
                display: "inline-block",
            }}
        >
            <Typography variant="body2" fontWeight="bold" noWrap>
                {title}: {formattedTime}
            </Typography>
        </Box>
    );
};

export default TimeToDoneBox;
