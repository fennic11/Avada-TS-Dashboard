import React, { useState } from "react";
import {
    Avatar,
    Typography,
    Space,
    Tag,
    Card,
    Button,
    Divider,
    Tooltip
} from "antd";
import { format, formatDistanceToNow } from "date-fns";

// Function to render formatted text (markdown-like to HTML)
const renderFormattedText = (text) => {
    if (!text) return '';
    
    // Convert markdown-like formatting to HTML
    let formattedText = text
        // Bold: **text** -> <strong>text</strong>
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        // Italic: *text* -> <em>text</em>
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        // Underline: __text__ -> <u>text</u>
        .replace(/__(.*?)__/g, '<u>$1</u>')
        // Links: [text](url) -> <a href="url">text</a>
        .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" style="color: #1890ff; text-decoration: underline;">$1</a>')
        // Lists: - item -> • item
        .replace(/^- (.+)$/gm, '• $1')
        // Numbered lists: 1. item -> 1. item (keep as is)
        .replace(/^\d+\. (.+)$/gm, '$&')
        // URLs: http://... -> clickable links
        .replace(/(https?:\/\/[^\s]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" style="color: #1890ff; text-decoration: underline;">$1</a>')
        // Line breaks
        .replace(/\n/g, '<br>');

    return formattedText;
};

const { Text, Title } = Typography;

const getActionBackgroundColor = (type) => {
    switch (type) {
        case "commentCard":
            return "rgba(76, 175, 80, 0.15)"; // Light green with 15% opacity
        case "updateCard":
            return "rgba(33, 150, 243, 0.15)"; // Light blue with 15% opacity
        case "addMemberToCard":
            return "rgba(156, 39, 176, 0.15)"; // Light secondary color with 15% opacity
        case "removeMemberFromCard":
            return "rgba(244, 67, 54, 0.15)"; // Light red with 15% opacity
        case "addAttachmentToCard":
            return "rgba(255, 152, 0, 0.15)"; // Light orange with 15% opacity
        case "deleteAttachmentFromCard":
            return "rgba(233, 30, 99, 0.15)"; // Light red with 15% opacity
        case "addChecklistToCard":
            return "rgba(0, 188, 212, 0.15)"; // Light cyan with 15% opacity
        case "createCard":
            return "rgba(139, 195, 74, 0.15)"; // Light green with 15% opacity
        default:
            return "rgba(96, 125, 139, 0.15)"; // Light grey with 15% opacity
    }
};

const CardActivityHistory = ({ actions }) => {
    const [filter, setFilter] = useState('all'); // 'all' or 'comments'

    const handleFilterChange = (newFilter) => {
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
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        {slackMatch && (
                            <Tag
                                color="#4A154B"
                                style={{
                                    color: 'white',
                                    cursor: 'pointer',
                                    fontSize: '0.875rem',
                                    padding: '4px 8px'
                                }}
                                onClick={() => window.open(slackMatch[2].trim(), '_blank')}
                            >
                                <Space>
                                    <img
                                        src="https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png"
                                        alt="Slack"
                                        style={{
                                            width: 16,
                                            height: 16
                                        }}
                                    />
                                    View Slack Message
                                </Space>
                            </Tag>
                        )}
                        {loomMatch && (
                            <div
                                style={{
                                    position: 'relative',
                                    paddingBottom: '56.25%', // 16:9 aspect ratio
                                    height: 0,
                                    overflow: 'hidden',
                                    maxWidth: '100%',
                                    background: '#000',
                                    borderRadius: 4,
                                    marginTop: 8
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
                            </div>
                        )}
                        <div style={{ 
                            fontSize: '14px',
                            lineHeight: 1.6,
                            color: 'rgba(0, 0, 0, 0.9)',
                            fontWeight: 400,
                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}>
                            {slackMatch ? (
                                <div dangerouslySetInnerHTML={{
                                    __html: renderFormattedText(text.split(slackLinkRegex)[0])
                                }} />
                            ) : loomMatch ? (
                                <div dangerouslySetInnerHTML={{
                                    __html: renderFormattedText(text.split(loomRegex)[0])
                                }} />
                            ) : (
                                <div dangerouslySetInnerHTML={{
                                    __html: renderFormattedText(text)
                                }} />
                            )}
                        </div>
                        {action.data.attachments && action.data.attachments.map((attachment, index) => {
                            // Check if it's an image attachment
                            if (attachment.mimeType?.startsWith('image/') || 
                                attachment.name?.match(/\.(jpg|jpeg|png|gif)$/i)) {
                                return (
                                    <div
                                        key={index}
                                        style={{
                                            position: "relative",
                                            cursor: "pointer"
                                        }}
                                        onMouseEnter={(e) => {
                                            const overlay = e.currentTarget.querySelector('.image-overlay');
                                            if (overlay) overlay.style.opacity = '1';
                                        }}
                                        onMouseLeave={(e) => {
                                            const overlay = e.currentTarget.querySelector('.image-overlay');
                                            if (overlay) overlay.style.opacity = '0';
                                        }}
                                    >
                                        <Card
                                            size="small"
                                            style={{
                                                padding: 8,
                                                borderRadius: 4,
                                                borderColor: "rgba(0, 0, 0, 0.12)",
                                                overflow: "hidden"
                                            }}
                                        >
                                            <img
                                                src={attachment.url || attachment.previewUrl}
                                                alt={attachment.name || "Comment attachment"}
                                                style={{
                                                    width: "100%",
                                                    height: "auto",
                                                    maxHeight: 300,
                                                    objectFit: "contain",
                                                    borderRadius: 2,
                                                    cursor: "pointer"
                                                }}
                                                onClick={() => window.open(attachment.url || attachment.previewUrl, "_blank")}
                                            />
                                        </Card>
                                        <div
                                            className="image-overlay"
                                            style={{
                                                position: "absolute",
                                                top: 0,
                                                left: 0,
                                                right: 0,
                                                bottom: 0,
                                                backgroundColor: "rgba(0, 0, 0, 0.5)",
                                                display: "flex",
                                                alignItems: "center",
                                                justifyContent: "center",
                                                opacity: 0,
                                                transition: "opacity 0.2s",
                                                borderRadius: 4,
                                                cursor: "pointer"
                                            }}
                                            onClick={() => window.open(attachment.url || attachment.previewUrl, "_blank")}
                                        >
                                            <Text
                                                style={{
                                                    color: "white",
                                                    backgroundColor: "rgba(0, 0, 0, 0.7)",
                                                    padding: "8px 16px",
                                                    borderRadius: 4,
                                                    cursor: "pointer"
                                                }}
                                            >
                                                View Full Size
                                            </Text>
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </Space>
                );

            case "updateCard":
                const { listBefore, listAfter, old, card } = action.data;
                
                // List movement
                if (listBefore && listAfter) {
                    return (
                        <Text type="secondary">
                            Moved to <strong>{listAfter.name}</strong>
                        </Text>
                    );
                }
                
                // Due date changes
                if (old && old.due != null) {
                    if (!card.due) {
                        return (
                            <Text type="secondary">
                                Removed due date
                            </Text>
                        );
                    }
                    return (
                        <Text type="secondary">
                            Due date: <strong>{format(new Date(card.due), "MMM d, yyyy")}</strong>
                        </Text>
                    );
                }

                // Due complete changes
                if (old && old.dueComplete != null) {
                    return (
                        <Text type="secondary">
                            Marked as <strong>{card.dueComplete ? "complete" : "incomplete"}</strong>
                        </Text>
                    );
                }
                
                // Description changes
                if (old && 'desc' in old) {
                    return (
                        <Text type="secondary">
                            Updated description
                        </Text>
                    );
                }

                // Return null for empty updates
                return null;

            case "addMemberToCard":
                return (
                    <Text type="secondary">
                        Added <strong>{action.member?.username || action.member?.fullName}</strong>
                    </Text>
                );

            case "removeMemberFromCard":
                return (
                    <Text type="secondary">
                        Removed <strong>{action.member?.username || action.member?.fullName}</strong>
                    </Text>
                );

            case "addAttachmentToCard":
                const attachment = action.data.attachment;
                if (attachment && (attachment.mimeType?.startsWith('image/') || 
                    attachment.name?.match(/\.(jpg|jpeg|png|gif)$/i))) {
                    return (
                        <div
                            style={{
                                position: "relative",
                                cursor: "pointer"
                            }}
                            onMouseEnter={(e) => {
                                const overlay = e.currentTarget.querySelector('.image-overlay');
                                if (overlay) overlay.style.opacity = '1';
                            }}
                            onMouseLeave={(e) => {
                                const overlay = e.currentTarget.querySelector('.image-overlay');
                                if (overlay) overlay.style.opacity = '0';
                            }}
                        >
                            <Card
                                size="small"
                                style={{
                                    padding: 8,
                                    borderRadius: 4,
                                    borderColor: "rgba(0, 0, 0, 0.12)",
                                    overflow: "hidden"
                                }}
                            >
                                <img
                                    src={attachment.url || attachment.previewUrl}
                                    alt={attachment.name || "Attachment"}
                                    style={{
                                        width: "100%",
                                        height: "auto",
                                        maxHeight: 300,
                                        objectFit: "contain",
                                        borderRadius: 2,
                                        cursor: "pointer"
                                    }}
                                    onClick={() => window.open(attachment.url || attachment.previewUrl, "_blank")}
                                />
                            </Card>
                            <div
                                className="image-overlay"
                                style={{
                                    position: "absolute",
                                    top: 0,
                                    left: 0,
                                    right: 0,
                                    bottom: 0,
                                    backgroundColor: "rgba(0, 0, 0, 0.5)",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    opacity: 0,
                                    transition: "opacity 0.2s",
                                    borderRadius: 4,
                                    cursor: "pointer"
                                }}
                                onClick={() => window.open(attachment.url || attachment.previewUrl, "_blank")}
                            >
                                <Text
                                    style={{
                                        color: "white",
                                        backgroundColor: "rgba(0, 0, 0, 0.7)",
                                        padding: "8px 16px",
                                        borderRadius: 4,
                                        cursor: "pointer"
                                    }}
                                >
                                    View Full Size
                                </Text>
                            </div>
                        </div>
                    );
                }
                return (
                    <Text type="secondary">
                        Added <strong>{attachment?.name}</strong>
                    </Text>
                );

            case "deleteAttachmentFromCard":
                return (
                    <Text type="secondary">
                        Removed <strong>{action.data.attachment?.name}</strong>
                    </Text>
                );

            case "addChecklistToCard":
                return (
                    <Text type="secondary">
                        Added checklist: <strong>{action.data.checklist?.name}</strong>
                    </Text>
                );

            case "createCard":
                return (
                    <Text type="secondary">
                        Created card
                    </Text>
                );

            default:
                return (
                    <Text type="secondary">
                        {action.type}
                    </Text>
                );
        }
    };

    return (
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div style={{ 
                display: 'flex',
                justifyContent: 'flex-end',
                marginBottom: 16
            }}>
                <Button.Group size="small">
                    <Button 
                        type={filter === 'all' ? 'primary' : 'default'}
                        onClick={() => handleFilterChange('all')}
                        style={{ 
                            borderTopLeftRadius: '8px',
                            borderBottomLeftRadius: '8px',
                            fontWeight: 600,
                            fontSize: '13px',
                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                    >
                        All Activities
                    </Button>
                    <Button 
                        type={filter === 'comments' ? 'primary' : 'default'}
                        onClick={() => handleFilterChange('comments')}
                        style={{ 
                            borderTopRightRadius: '8px',
                            borderBottomRightRadius: '8px',
                            fontWeight: 600,
                            fontSize: '13px',
                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                        }}
                    >
                        Comments Only
                    </Button>
                </Button.Group>
            </div>
            {filteredActions.map((action, index) => {
                // Check if this is the first action and has Slack link
                if (index === 0 && action.type === "commentCard") {
                    const text = action.data.text;
                    const slackLinkRegex = /\[([^\]]+)\]\((https:\/\/avadaio\.slack\.com\/archives\/[^)\s]+)/;
                    const slackMatch = text.match(slackLinkRegex);
                    
                    if (slackMatch) {
                        return (
                            <div key={action.id}>
                                <Tag
                                    color="#4A154B"
                                    style={{
                                        color: 'white',
                                        cursor: 'pointer',
                                        fontSize: '0.875rem',
                                        padding: '4px 8px',
                                        marginBottom: 16
                                    }}
                                    onClick={() => window.open(slackMatch[2].trim(), '_blank')}
                                >
                                    <Space>
                                        <img
                                            src="https://a.slack-edge.com/80588/marketing/img/icons/icon_slack_hash_colored.png"
                                            alt="Slack"
                                            style={{
                                                width: 16,
                                                height: 16
                                            }}
                                        />
                                        View Slack Message
                                    </Space>
                                </Tag>
                                <Card
                                    size="small"
                                    style={{
                                        display: "flex",
                                        gap: 16,
                                        padding: 16,
                                        borderRadius: 4,
                                        backgroundColor: "#ffffff",
                                        position: "relative",
                                        transition: "all 0.2s ease-in-out",
                                        cursor: "pointer"
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.transform = "translateX(4px)";
                                        e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.transform = "translateX(0)";
                                        e.currentTarget.style.boxShadow = "none";
                                    }}
                                >
                                    <div style={{
                                        position: "absolute",
                                        left: 0,
                                        top: 0,
                                        bottom: 0,
                                        width: "4px",
                                        backgroundColor: getActionColor(action.type),
                                        borderTopLeftRadius: "4px",
                                        borderBottomLeftRadius: "4px"
                                    }} />
                                    <Avatar
                                        src={action.memberCreator?.avatarUrl}
                                        alt={action.memberCreator?.fullName}
                                        style={{ 
                                            width: 32, 
                                            height: 32,
                                            border: "2px solid white",
                                            boxShadow: "0 2px 4px rgba(0,0,0,0.1)"
                                        }}
                                    />
                                    <div style={{ flex: 1 }}>
                                        <Space style={{ 
                                            display: "flex", 
                                            alignItems: "center", 
                                            marginBottom: 4,
                                            flexWrap: "wrap"
                                        }}>
                                            <Text strong>
                                                {action.memberCreator?.username || action.memberCreator?.fullName}
                                            </Text>
                                            <Tooltip title={format(new Date(action.date), 'MMM d, yyyy HH:mm:ss')}>
                                                <Tag
                                                    style={{ 
                                                        backgroundColor: "rgba(0,0,0,0.05)",
                                                        padding: "2px 8px",
                                                        borderRadius: 4,
                                                        fontSize: '12px',
                                                        color: 'rgba(0, 0, 0, 0.65)',
                                                        fontWeight: 500
                                                    }}
                                                >
                                                    {formatDistanceToNow(new Date(action.date), { addSuffix: true })}
                                                </Tag>
                                            </Tooltip>
                                            {action.appCreator && (
                                                <Tag
                                                    size="small"
                                                    style={{ 
                                                        backgroundColor: "rgba(0,0,0,0.05)",
                                                        fontSize: "12px"
                                                    }}
                                                >
                                                    {action.appCreator.name}
                                                </Tag>
                                            )}
                                        </Space>
                                        <div style={{ 
                                            marginTop: 8,
                                            fontSize: '14px',
                                            lineHeight: 1.6,
                                            color: 'rgba(0, 0, 0, 0.9)',
                                            fontWeight: 400,
                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                        }}>
                                            {text.split(slackLinkRegex)[0]}
                                        </div>
                                    </div>
                                </Card>
                            </div>
                        );
                    }
                }
                
                // Get the content first
                const content = renderContent(action);
                // Skip if content is null
                if (content === null) return null;
                
                return (
                    <div
                        key={action.id}
                        style={{
                            display: "flex",
                            gap: 12,
                            padding: 16,
                            borderRadius: 8,
                            backgroundColor: "#ffffff",
                            border: "1px solid rgba(0, 0, 0, 0.08)",
                            marginBottom: 12,
                            transition: "all 0.2s ease-in-out"
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.1)";
                            e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.12)";
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.boxShadow = "none";
                            e.currentTarget.style.borderColor = "rgba(0, 0, 0, 0.08)";
                        }}
                    >
                        {/* Avatar */}
                        <Avatar
                            src={action.memberCreator?.avatarUrl}
                            alt={action.memberCreator?.fullName}
                            style={{ 
                                width: 40, 
                                height: 40,
                                flexShrink: 0
                            }}
                        />
                        
                        {/* Content */}
                        <div style={{ flex: 1 }}>
                            {/* User Info */}
                            <div style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: 8,
                                marginBottom: 4
                            }}>
                                <Text 
                                    strong
                                    style={{
                                        fontSize: '14px',
                                        color: '#1e293b',
                                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                        fontWeight: 600
                                    }}
                                >
                                    {action.memberCreator?.username || action.memberCreator?.fullName}
                                </Text>
                                <Tooltip title={format(new Date(action.date), 'MMM d, yyyy HH:mm:ss')}>
                                    <Text 
                                        style={{
                                            fontSize: '12px',
                                            color: 'rgba(0, 0, 0, 0.65)',
                                            fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                            fontWeight: 500,
                                            cursor: 'pointer'
                                        }}
                                    >
                                        {formatDistanceToNow(new Date(action.date), { addSuffix: true })}
                                    </Text>
                                </Tooltip>
                            </div>
                            
                            {/* Action Content */}
                            <div style={{ 
                                marginBottom: 8,
                                fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
                                fontSize: '14px',
                                lineHeight: 1.6,
                                color: 'rgba(0, 0, 0, 0.9)',
                                fontWeight: 400
                            }}>
                                {content}
                            </div>
                            
                            {/* Action Buttons */}
                            <div style={{ 
                                display: "flex", 
                                alignItems: "center", 
                                gap: 16
                            }}>
                                <Button
                                    type="text"
                                    size="small"
                                    style={{
                                        padding: '4px 8px',
                                        height: 'auto',
                                        color: 'rgba(0, 0, 0, 0.45)',
                                        fontSize: '12px',
                                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#1890ff';
                                        e.currentTarget.style.backgroundColor = 'rgba(24, 144, 255, 0.04)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'rgba(0, 0, 0, 0.45)';
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    👍 Like
                                </Button>
                                <Button
                                    type="text"
                                    size="small"
                                    style={{
                                        padding: '4px 8px',
                                        height: 'auto',
                                        color: 'rgba(0, 0, 0, 0.45)',
                                        fontSize: '12px',
                                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#1890ff';
                                        e.currentTarget.style.backgroundColor = 'rgba(24, 144, 255, 0.04)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'rgba(0, 0, 0, 0.45)';
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    😊 React
                                </Button>
                                <Button
                                    type="text"
                                    size="small"
                                    style={{
                                        padding: '4px 8px',
                                        height: 'auto',
                                        color: 'rgba(0, 0, 0, 0.45)',
                                        fontSize: '12px',
                                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#1890ff';
                                        e.currentTarget.style.backgroundColor = 'rgba(24, 144, 255, 0.04)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'rgba(0, 0, 0, 0.45)';
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    Reply
                                </Button>
                                <Button
                                    type="text"
                                    size="small"
                                    style={{
                                        padding: '4px 8px',
                                        height: 'auto',
                                        color: 'rgba(0, 0, 0, 0.45)',
                                        fontSize: '12px',
                                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#1890ff';
                                        e.currentTarget.style.backgroundColor = 'rgba(24, 144, 255, 0.04)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'rgba(0, 0, 0, 0.45)';
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    Edit
                                </Button>
                                <Button
                                    type="text"
                                    size="small"
                                    style={{
                                        padding: '4px 8px',
                                        height: 'auto',
                                        color: 'rgba(0, 0, 0, 0.45)',
                                        fontSize: '12px',
                                        fontFamily: '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
                                    }}
                                    onMouseEnter={(e) => {
                                        e.currentTarget.style.color = '#ff4d4f';
                                        e.currentTarget.style.backgroundColor = 'rgba(255, 77, 79, 0.04)';
                                    }}
                                    onMouseLeave={(e) => {
                                        e.currentTarget.style.color = 'rgba(0, 0, 0, 0.45)';
                                        e.currentTarget.style.backgroundColor = 'transparent';
                                    }}
                                >
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                );
            })}
        </Space>
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
