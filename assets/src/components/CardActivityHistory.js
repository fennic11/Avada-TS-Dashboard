import React from "react";
import {
    Avatar,
    Card,
    CardHeader,
    CardContent,
    Typography,
    Box,
    Stack,
    Link,
    Paper
} from "@mui/material";
import { format, formatDistanceToNow } from "date-fns";

const CardActivityHistory = ({ actions }) => {
    const extractImageUrl = (text) => {
        // Match Trello image attachment pattern
        const imagePattern = /\[image\.png\]\((https:\/\/trello\.com\/1\/cards\/[^)]+)\)/;
        const match = text.match(imagePattern);
        return match ? match[1] : null;
    };

    const renderContent = (action) => {
        switch (action.type) {
            case "commentCard":
                const imageUrl = extractImageUrl(action.data.text);
                return (
                    <Stack spacing={1}>
                        <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                            {action.data.text.replace(/\[image\.png\]\(.*\)/, "")}
                        </Typography>
                        {imageUrl && (
                            <Box
                                sx={{
                                    position: "relative",
                                    "&:hover .image-overlay": {
                                        opacity: 1
                                    }
                                }}
                            >
                                <Paper
                                    variant="outlined"
                                    sx={{
                                        p: 1,
                                        borderRadius: 1,
                                        borderColor: "rgba(0, 0, 0, 0.12)",
                                        overflow: "hidden"
                                    }}
                                >
                                    <Box
                                        component="img"
                                        src={imageUrl}
                                        alt="Comment attachment"
                                        sx={{
                                            width: "100%",
                                            height: "auto",
                                            maxHeight: 300,
                                            objectFit: "contain",
                                            borderRadius: 0.5,
                                            cursor: "pointer"
                                        }}
                                        onClick={() => window.open(imageUrl, "_blank")}
                                    />
                                </Paper>
                                <Box
                                    className="image-overlay"
                                    sx={{
                                        position: "absolute",
                                        top: 0,
                                        left: 0,
                                        right: 0,
                                        bottom: 0,
                                        bgcolor: "rgba(0, 0, 0, 0.5)",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                        opacity: 0,
                                        transition: "opacity 0.2s",
                                        borderRadius: 1
                                    }}
                                >
                                    <Typography
                                        variant="button"
                                        sx={{
                                            color: "white",
                                            bgcolor: "rgba(0, 0, 0, 0.7)",
                                            px: 2,
                                            py: 1,
                                            borderRadius: 1
                                        }}
                                    >
                                        View Full Size
                                    </Typography>
                                </Box>
                            </Box>
                        )}
                    </Stack>
                );

            case "updateCard":
                const { listBefore, listAfter, old, card } = action.data;
                
                // List movement
                if (listBefore && listAfter) {
                    return (
                        <Typography variant="body2" color="text.secondary">
                            Moved card from <strong>{listBefore.name}</strong> to <strong>{listAfter.name}</strong>
                        </Typography>
                    );
                }
                
                // Due date changes
                if (old && old.due != null) {
                    if (!card.due) {
                        return (
                            <Typography variant="body2" color="text.secondary">
                                Removed due date
                            </Typography>
                        );
                    }
                    return (
                        <Typography variant="body2" color="text.secondary">
                            Updated due date to <strong>{format(new Date(card.due), "MMM d, yyyy")}</strong>
                        </Typography>
                    );
                }
                
                // Description changes
                if (old && 'desc' in old) {
                    return (
                        <Typography variant="body2" color="text.secondary">
                            Updated description
                        </Typography>
                    );
                }

                return (
                    <Typography variant="body2" color="text.secondary">
                        Updated card
                    </Typography>
                );

            case "addMemberToCard":
                return (
                    <Typography variant="body2" color="text.secondary">
                        Added <strong>{action.member?.fullName}</strong> to card
                    </Typography>
                );

            case "removeMemberFromCard":
                return (
                    <Typography variant="body2" color="text.secondary">
                        Removed <strong>{action.member?.fullName}</strong> from card
                    </Typography>
                );

            case "addAttachmentToCard":
                return (
                    <Typography variant="body2" color="text.secondary">
                        Added attachment: <strong>{action.data.attachment?.name}</strong>
                    </Typography>
                );

            case "deleteAttachmentFromCard":
                return (
                    <Typography variant="body2" color="text.secondary">
                        Removed attachment: <strong>{action.data.attachment?.name}</strong>
                    </Typography>
                );

            case "addChecklistToCard":
                return (
                    <Typography variant="body2" color="text.secondary">
                        Added checklist: <strong>{action.data.checklist?.name}</strong>
                    </Typography>
                );

            case "createCard":
                return (
                    <Typography variant="body2" color="text.secondary">
                        Created this card
                    </Typography>
                );

            default:
                return (
                    <Typography variant="body2" color="text.secondary">
                        {action.type}
                    </Typography>
                );
        }
    };

    return (
        <Stack spacing={2}>
            {actions.map((action) => (
                <Box
                    key={action.id}
                    sx={{
                        display: "flex",
                        gap: 2,
                        p: 2,
                        borderRadius: 1,
                        bgcolor: "background.paper",
                        "&:hover": {
                            bgcolor: "action.hover"
                        }
                    }}
                >
                    <Avatar
                        src={action.memberCreator?.avatarUrl}
                        alt={action.memberCreator?.fullName}
                        sx={{ width: 32, height: 32 }}
                    />
                    <Box sx={{ flex: 1 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
                            <Typography variant="subtitle2">
                                {action.memberCreator?.fullName}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                                {formatDistanceToNow(new Date(action.date), { addSuffix: true })}
                            </Typography>
                        </Box>
                        {renderContent(action)}
                    </Box>
                </Box>
            ))}
        </Stack>
    );
};

export default CardActivityHistory;
