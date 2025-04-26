import React, { useState } from "react";
import {
    Avatar,
    Typography,
    Box,
    Stack,
    Link,
    Paper,
    Chip,
    ToggleButtonGroup,
    ToggleButton
} from "@mui/material";
import { format, formatDistanceToNow } from "date-fns";
import { useTheme } from "@mui/material/styles";

const getActionBackgroundColor = (type, theme) => {
    switch (type) {
        case "commentCard":
            return `${theme.palette.success.light}15`; // Light green with 15% opacity
        case "updateCard":
            return `${theme.palette.info.light}15`; // Light blue with 15% opacity
        case "addMemberToCard":
            return `${theme.palette.secondary.light}15`; // Light secondary color with 15% opacity
        case "removeMemberFromCard":
            return `${theme.palette.error.light}15`; // Light red with 15% opacity
        case "addAttachmentToCard":
            return `${theme.palette.warning.light}15`; // Light orange with 15% opacity
        case "deleteAttachmentFromCard":
            return `${theme.palette.error.light}15`; // Light red with 15% opacity
        case "addChecklistToCard":
            return `${theme.palette.info.light}15`; // Light cyan with 15% opacity
        case "createCard":
            return `${theme.palette.success.light}15`; // Light green with 15% opacity
        default:
            return `${theme.palette.grey[300]}15`; // Light grey with 15% opacity
    }
};

const CardActivityHistory = ({ actions }) => {
    const theme = useTheme();
    const [filter, setFilter] = useState('all'); // 'all' or 'comments'

    const handleFilterChange = (event, newFilter) => {
        if (newFilter !== null) {
            setFilter(newFilter);
        }
    };

    const filteredActions = actions.filter(action => {
        if (filter === 'all') return true;
        return action.type === 'commentCard';
    });

    const renderContent = (action) => {
        switch (action.type) {
            case "commentCard":
                // Tách nội dung thành các phần để xử lý link
                const text = action.data.text;
                const slackLinkRegex = /\[([^\]]+)\]\((https:\/\/avadaio\.slack\.com\/archives\/[^)\s]+)/;
                const slackMatch = text.match(slackLinkRegex);
                const loomRegex = /(?:\[([^\]]+)\]\()?(https:\/\/www\.loom\.com\/share\/[^\s)]+)(?:\))?/;
                const loomMatch = text.match(loomRegex);
                
                return (
                    <Stack spacing={1}>
                        {slackMatch && (
                            <Chip
                                label="View Slack Message"
                                component="a"
                                href={slackMatch[2].trim()}
                                target="_blank"
                                rel="noopener noreferrer"
                                clickable
                                sx={{
                                    bgcolor: '#4A154B',
                                    color: 'white',
                                    '&:hover': {
                                        bgcolor: '#5c1b5d'
                                    },
                                    '& .MuiChip-label': {
                                        fontSize: '0.875rem'
                                    }
                                }}
                                icon={
                                    <Box
                                        component="img"
                                        src="https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png"
                                        alt="Slack"
                                        sx={{
                                            width: 16,
                                            height: 16,
                                            ml: 0.5
                                        }}
                                    />
                                }
                            />
                        )}
                        {loomMatch && (
                            <Box
                                sx={{
                                    position: 'relative',
                                    paddingBottom: '56.25%', // 16:9 aspect ratio
                                    height: 0,
                                    overflow: 'hidden',
                                    maxWidth: '100%',
                                    background: '#000',
                                    borderRadius: 1,
                                    mt: 1
                                }}
                            >
                                <iframe
                                    src={`https://www.loom.com/embed/${loomMatch[2].split('/').pop()}`}
                                    frameBorder="0"
                                    allowFullScreen
                                    webkitallowfullscreen
                                    mozallowfullscreen
                                    style={{
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        width: '100%',
                                        height: '100%'
                                    }}
                                />
                            </Box>
                        )}
                        <Typography variant="body2" sx={{ whiteSpace: "pre-line" }}>
                            {slackMatch ? (
                                text.split(slackLinkRegex)[0]
                            ) : loomMatch ? (
                                text.split(loomRegex)[0]
                            ) : (
                                text.split(/(https?:\/\/[^\s]+)/g).map((part, index) => {
                                    if (part.match(/^https?:\/\//)) {
                                        return (
                                            <Link
                                                key={index}
                                                href={part}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                sx={{
                                                    color: 'primary.main',
                                                    textDecoration: 'none',
                                                    wordBreak: 'break-all',
                                                    display: 'inline-block',
                                                    maxWidth: '100%',
                                                    '&:hover': {
                                                        textDecoration: 'underline'
                                                    }
                                                }}
                                            >
                                                {part}
                                            </Link>
                                        );
                                    }
                                    return part;
                                })
                            )}
                        </Typography>
                        {action.data.attachments && action.data.attachments.map((attachment, index) => {
                            // Check if it's an image attachment
                            if (attachment.mimeType?.startsWith('image/') || 
                                attachment.name?.match(/\.(jpg|jpeg|png|gif)$/i)) {
                                return (
                                    <Box
                                        key={index}
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
                                                src={attachment.url || attachment.previewUrl}
                                                alt={attachment.name || "Comment attachment"}
                                                sx={{
                                                    width: "100%",
                                                    height: "auto",
                                                    maxHeight: 300,
                                                    objectFit: "contain",
                                                    borderRadius: 0.5,
                                                    cursor: "pointer"
                                                }}
                                                onClick={() => window.open(attachment.url || attachment.previewUrl, "_blank")}
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
                                                borderRadius: 1,
                                                cursor: "pointer"
                                            }}
                                            onClick={() => window.open(attachment.url || attachment.previewUrl, "_blank")}
                                        >
                                            <Typography
                                                variant="button"
                                                sx={{
                                                    color: "white",
                                                    bgcolor: "rgba(0, 0, 0, 0.7)",
                                                    px: 2,
                                                    py: 1,
                                                    borderRadius: 1,
                                                    cursor: "pointer",
                                                    "&:hover": {
                                                        bgcolor: "rgba(0, 0, 0, 0.8)"
                                                    }
                                                }}
                                            >
                                                View Full Size
                                            </Typography>
                                        </Box>
                                    </Box>
                                );
                            }
                            return null;
                        })}
                    </Stack>
                );

            case "updateCard":
                const { listBefore, listAfter, old, card } = action.data;
                
                // List movement
                if (listBefore && listAfter) {
                    return (
                        <Typography variant="body2" color="text.secondary">
                            Moved to <strong>{listAfter.name}</strong>
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
                            Due date: <strong>{format(new Date(card.due), "MMM d, yyyy")}</strong>
                        </Typography>
                    );
                }

                // Due complete changes
                if (old && old.dueComplete != null) {
                    return (
                        <Typography variant="body2" color="text.secondary">
                            Marked as <strong>{card.dueComplete ? "complete" : "incomplete"}</strong>
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

                // Return null for empty updates
                return null;

            case "addMemberToCard":
                return (
                    <Typography variant="body2" color="text.secondary">
                        Added <strong>{action.member?.username || action.member?.fullName}</strong>
                    </Typography>
                );

            case "removeMemberFromCard":
                return (
                    <Typography variant="body2" color="text.secondary">
                        Removed <strong>{action.member?.username || action.member?.fullName}</strong>
                    </Typography>
                );

            case "addAttachmentToCard":
                const attachment = action.data.attachment;
                if (attachment && (attachment.mimeType?.startsWith('image/') || 
                    attachment.name?.match(/\.(jpg|jpeg|png|gif)$/i))) {
                    return (
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
                                    src={attachment.url || attachment.previewUrl}
                                    alt={attachment.name || "Attachment"}
                                    sx={{
                                        width: "100%",
                                        height: "auto",
                                        maxHeight: 300,
                                        objectFit: "contain",
                                        borderRadius: 0.5,
                                        cursor: "pointer"
                                    }}
                                    onClick={() => window.open(attachment.url || attachment.previewUrl, "_blank")}
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
                                    borderRadius: 1,
                                    cursor: "pointer"
                                }}
                                onClick={() => window.open(attachment.url || attachment.previewUrl, "_blank")}
                            >
                                <Typography
                                    variant="button"
                                    sx={{
                                        color: "white",
                                        bgcolor: "rgba(0, 0, 0, 0.7)",
                                        px: 2,
                                        py: 1,
                                        borderRadius: 1,
                                        cursor: "pointer",
                                        "&:hover": {
                                            bgcolor: "rgba(0, 0, 0, 0.8)"
                                        }
                                    }}
                                >
                                    View Full Size
                                </Typography>
                            </Box>
                        </Box>
                    );
                }
                return (
                    <Typography variant="body2" color="text.secondary">
                        Added <strong>{attachment?.name}</strong>
                    </Typography>
                );

            case "deleteAttachmentFromCard":
                return (
                    <Typography variant="body2" color="text.secondary">
                        Removed <strong>{action.data.attachment?.name}</strong>
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
                        Created card
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
            <Box sx={{ 
                display: 'flex',
                justifyContent: 'flex-end',
                mb: 2
            }}>
                <ToggleButtonGroup
                    value={filter}
                    exclusive
                    onChange={handleFilterChange}
                    size="small"
                    sx={{
                        '& .MuiToggleButton-root': {
                            textTransform: 'none',
                            px: 2,
                            py: 0.5,
                            color: '#64748b',
                            borderColor: 'rgba(0, 0, 0, 0.08)',
                            '&.Mui-selected': {
                                bgcolor: 'primary.main',
                                color: 'white',
                                '&:hover': {
                                    bgcolor: 'primary.dark',
                                }
                            },
                            '&:hover': {
                                bgcolor: 'rgba(0, 0, 0, 0.04)',
                            }
                        }
                    }}
                >
                    <ToggleButton 
                        value="all"
                        sx={{ 
                            borderTopLeftRadius: '6px !important',
                            borderBottomLeftRadius: '6px !important',
                        }}
                    >
                        All Activities
                    </ToggleButton>
                    <ToggleButton 
                        value="comments"
                        sx={{ 
                            borderTopRightRadius: '6px !important',
                            borderBottomRightRadius: '6px !important',
                        }}
                    >
                        Comments Only
                    </ToggleButton>
                </ToggleButtonGroup>
            </Box>
            {filteredActions.map((action, index) => {
                // Check if this is the first action and has Slack link
                if (index === 0 && action.type === "commentCard") {
                    const text = action.data.text;
                    const slackLinkRegex = /\[([^\]]+)\]\((https:\/\/avadaio\.slack\.com\/archives\/[^)\s]+)/;
                    const slackMatch = text.match(slackLinkRegex);
                    
                    if (slackMatch) {
                        return (
                            <Box key={action.id}>
                                <Chip
                                    label="View Slack Message"
                                    component="a"
                                    href={slackMatch[2].trim()}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    clickable
                                    sx={{
                                        bgcolor: '#4A154B',
                                        color: 'white',
                                        '&:hover': {
                                            bgcolor: '#5c1b5d'
                                        },
                                        '& .MuiChip-label': {
                                            fontSize: '0.875rem'
                                        },
                                        mb: 2
                                    }}
                                    icon={
                                        <Box
                                            component="img"
                                            src="https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png"
                                            alt="Slack"
                                            sx={{
                                                width: 16,
                                                height: 16,
                                                ml: 0.5
                                            }}
                                        />
                                    }
                                />
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 2,
                                        p: 2,
                                        borderRadius: 1,
                                        bgcolor: "background.paper",
                                        position: "relative",
                                        transition: "all 0.2s ease-in-out",
                                        "&:hover": {
                                            bgcolor: "action.hover",
                                            transform: "translateX(4px)",
                                            boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                                        },
                                        "&::before": {
                                            content: '""',
                                            position: "absolute",
                                            left: 0,
                                            top: 0,
                                            bottom: 0,
                                            width: "4px",
                                            bgcolor: getActionColor(action.type),
                                            borderTopLeftRadius: "4px",
                                            borderBottomLeftRadius: "4px"
                                        }
                                    }}
                                >
                                    <Avatar
                                        src={action.memberCreator?.avatarUrl}
                                        alt={action.memberCreator?.fullName}
                                        sx={{ 
                                            width: 32, 
                                            height: 32,
                                            border: "2px solid white",
                                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                        }}
                                    />
                                    <Box sx={{ flex: 1 }}>
                                        <Box sx={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            gap: 1, 
                                            mb: 0.5,
                                            flexWrap: "wrap"
                                        }}>
                                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                                {action.memberCreator?.username || action.memberCreator?.fullName}
                                            </Typography>
                                            <Typography 
                                                variant="caption" 
                                                color="text.secondary" 
                                                sx={{ 
                                                    bgcolor: "rgba(0,0,0,0.05)",
                                                    px: 1,
                                                    py: 0.5,
                                                    borderRadius: 1,
                                                    position: 'relative',
                                                    '&:hover::after': {
                                                        content: `"${format(new Date(action.date), 'MMM d, yyyy HH:mm:ss')}"`,
                                                        position: 'absolute',
                                                        bottom: '100%',
                                                        left: '50%',
                                                        transform: 'translateX(-50%)',
                                                        bgcolor: 'rgba(0,0,0,0.8)',
                                                        color: 'white',
                                                        padding: '4px 8px',
                                                        borderRadius: '4px',
                                                        fontSize: '12px',
                                                        whiteSpace: 'nowrap',
                                                        zIndex: 1,
                                                        mb: 1
                                                    }
                                                }}
                                            >
                                                {formatDistanceToNow(new Date(action.date), { addSuffix: true })}
                                            </Typography>
                                            {action.appCreator && (
                                                <Chip
                                                    size="small"
                                                    label={action.appCreator.name}
                                                    sx={{ 
                                                        ml: 1,
                                                        bgcolor: "rgba(0,0,0,0.05)",
                                                        "& .MuiChip-label": {
                                                            fontSize: "0.75rem"
                                                        }
                                                    }}
                                                />
                                            )}
                                        </Box>
                                        <Box sx={{ 
                                            mt: 1,
                                            "& strong": {
                                                color: "primary.main"
                                            }
                                        }}>
                                            {text.split(slackLinkRegex)[0]}
                                        </Box>
                                    </Box>
                                </Box>
                            </Box>
                        );
                    }
                }
                
                // Get the content first
                const content = renderContent(action);
                // Skip if content is null
                if (content === null) return null;
                
                return (
                    <Box
                        key={action.id}
                        sx={{
                            display: "flex",
                            gap: 2,
                            p: 2,
                            borderRadius: 1,
                            bgcolor: getActionBackgroundColor(action.type, theme),
                            position: "relative",
                            transition: "all 0.2s ease-in-out",
                            "&:hover": {
                                transform: "translateX(4px)",
                                boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
                                bgcolor: (theme) => `${getActionBackgroundColor(action.type, theme).slice(0, -2)}25`,
                            },
                            "&::before": {
                                content: '""',
                                position: "absolute",
                                left: 0,
                                top: 0,
                                bottom: 0,
                                width: "4px",
                                bgcolor: getActionColor(action.type),
                                borderTopLeftRadius: "4px",
                                borderBottomLeftRadius: "4px"
                            },
                            borderLeft: `1px solid ${theme.palette.divider}`,
                            borderRight: `1px solid ${theme.palette.divider}`,
                            borderTop: `1px solid ${theme.palette.divider}`,
                            borderBottom: `1px solid ${theme.palette.divider}`,
                        }}
                    >
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            alignItems: 'center',
                            gap: 1 
                        }}>
                            <Avatar
                                src={action.memberCreator?.avatarUrl}
                                alt={action.memberCreator?.fullName}
                                sx={{ 
                                    width: 40, 
                                    height: 40,
                                    border: "2px solid white",
                                    boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                }}
                            />
                            <Typography 
                                variant="caption" 
                                color="text.secondary"
                                sx={{
                                    fontSize: '0.7rem',
                                    textAlign: 'center',
                                    maxWidth: '80px',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    whiteSpace: 'nowrap'
                                }}
                            >
                                {action.memberCreator?.username || action.memberCreator?.fullName}
                            </Typography>
                        </Box>

                        <Box sx={{ 
                            flex: 1,
                            borderLeft: `1px dashed ${theme.palette.divider}`,
                            pl: 2,
                            ml: 1
                        }}>
                            <Box sx={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: 1, 
                                mb: 1.5,
                                pb: 1.5,
                                borderBottom: `1px solid ${theme.palette.divider}`,
                                flexWrap: "wrap",
                                justifyContent: 'space-between'
                            }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography 
                                        variant="caption" 
                                        sx={{ 
                                            bgcolor: "rgba(255,255,255,0.5)",
                                            px: 1.5,
                                            py: 0.5,
                                            borderRadius: 1,
                                            position: 'relative',
                                            fontWeight: 500,
                                            '&:hover::after': {
                                                content: `"${format(new Date(action.date), 'MMM d, yyyy HH:mm:ss')}"`,
                                                position: 'absolute',
                                                bottom: '100%',
                                                left: '50%',
                                                transform: 'translateX(-50%)',
                                                bgcolor: 'rgba(0,0,0,0.8)',
                                                color: 'white',
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                fontSize: '12px',
                                                whiteSpace: 'nowrap',
                                                zIndex: 1,
                                                mb: 1
                                            }
                                        }}
                                    >
                                        {formatDistanceToNow(new Date(action.date), { addSuffix: true })}
                                    </Typography>
                                    {action.appCreator && (
                                        <Chip
                                            size="small"
                                            label={action.appCreator.name}
                                            sx={{ 
                                                bgcolor: "rgba(255,255,255,0.5)",
                                                "& .MuiChip-label": {
                                                    fontSize: "0.75rem"
                                                }
                                            }}
                                        />
                                    )}
                                </Box>
                                <Chip
                                    size="small"
                                    label={action.type.replace(/([A-Z])/g, ' $1').trim()}
                                    sx={{ 
                                        bgcolor: "rgba(255,255,255,0.5)",
                                        color: getActionColor(action.type),
                                        borderColor: getActionColor(action.type),
                                        border: '1px solid',
                                        "& .MuiChip-label": {
                                            fontSize: "0.75rem",
                                            textTransform: 'capitalize'
                                        }
                                    }}
                                />
                            </Box>
                            <Box sx={{ 
                                "& strong": {
                                    color: "primary.main",
                                    fontWeight: 600
                                }
                            }}>
                                {content}
                            </Box>
                        </Box>
                    </Box>
                );
            })}
        </Stack>
    );
};

const getActionColor = (type) => {
    switch (type) {
        case "commentCard":
            return "#4CAF50";
        case "updateCard":
            return "#2196F3";
        case "addMemberToCard":
            return "#9C27B0";
        case "removeMemberFromCard":
            return "#F44336";
        case "addAttachmentToCard":
            return "#FF9800";
        case "deleteAttachmentFromCard":
            return "#E91E63";
        case "addChecklistToCard":
            return "#00BCD4";
        case "createCard":
            return "#8BC34A";
        default:
            return "#607D8B";
    }
};

export default CardActivityHistory;
