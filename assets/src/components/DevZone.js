import React, { useState, useEffect } from "react";
import {
    Button,
    LinearProgress,
    Typography,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    TextField,
    Box,
    Paper,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Chip,
    Tooltip,
    Link
} from "@mui/material";
import {
    getCardsByList,
    getActionsByCard,
    getListsByBoardId,
    getMembers,
    getBoardLabels
} from "../api/trelloApi";
import { calculateResolutionTime } from "../utils/resolutionTime";
import { postCards } from "../api/cardsApi";
import { updateUser } from "../api/usersApi";
import members from "../data/members.json";
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { alpha } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import { postDevCards } from "../api/devCardsApi";
import { calculateDevResolutionTime } from "../utils/devResolutionTime";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const DevZone = () => {
    const [progress, setProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [log, setLog] = useState("");
    const [lists, setLists] = useState([]);
    const [selectedListId, setSelectedListId] = useState("");
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: "",
        severity: "success"
    });
    const [selectedCard, setSelectedCard] = useState(null);
    const [cardActions, setCardActions] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [cardIdInput, setCardIdInput] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [token, setToken] = useState('');
    const [cardDetails, setCardDetails] = useState(null);
    const [isCardDetailsModalOpen, setIsCardDetailsModalOpen] = useState(false);
    const [boardMembers, setBoardMembers] = useState(null);
    const [isMembersModalOpen, setIsMembersModalOpen] = useState(false);
    const [listsData, setListsData] = useState(null);
    const [isListsModalOpen, setIsListsModalOpen] = useState(false);
    const [boardLabels, setBoardLabels] = useState(null);
    const [isLabelsModalOpen, setIsLabelsModalOpen] = useState(false);
    const [updateUserData, setUpdateUserData] = useState({
        email: "",
        apiKey: "",
        token: ""
    });

    const [channels, setChannels] = useState(null);
    const [isChannelsModalOpen, setIsChannelsModalOpen] = useState(false);
    const [appStats, setAppStats] = useState({});
    const theme = useTheme();

    // Tạo Set chứa các member ID hợp lệ
    const validMemberIds = new Set(members.map(m => m.id));

    // Format members data for Autocomplete




    // Add these new state variables after other useState declarations
    const [isStatsModalOpen, setIsStatsModalOpen] = useState(false);
    const [isJsonModalOpen, setIsJsonModalOpen] = useState(false);
    const [jsonData, setJsonData] = useState(null);

    // Add new state for export modal
    const [isExportModalOpen, setIsExportModalOpen] = useState(false);
    const [exportData, setExportData] = useState(null);

    // Add new state for multiple lists
    const [listIds, setListIds] = useState(['']);

    const [conversationNote, setConversationNote] = useState('');

    const [devProgress, setDevProgress] = useState(0);
    const [isDevLoading, setIsDevLoading] = useState(false);
    const [devLog, setDevLog] = useState("");

    useEffect(() => {
        const fetchLists = async () => {
            try {
                const res = await getListsByBoardId("638d769884c52b05235a2310");
                setLists(res);
            } catch (err) {
                console.error("Lỗi khi lấy danh sách list:", err);
            }
        };
        fetchLists();
    }, []);

    const handleProcess = async () => {
        if (!selectedListId) {
            alert("Vui lòng chọn một list!");
            return;
        }

        setIsLoading(true);
        setProgress(0);
        setLog("Đang lấy dữ liệu cards...");

        let allCards = await getCardsByList(selectedListId);
        const total = allCards.length;
        const batchSize = 10;

        for (let i = 0; i < total; i += batchSize) {
            const batch = allCards.slice(i, i + batchSize);

            await Promise.all(batch.map(async (card) => {
                try {
                    // Kiểm tra members của card
                    const hasValidMembers = card.idMembers?.some(memberId => validMemberIds.has(memberId));
                    
                    if (!hasValidMembers) {
                        console.log(`⚠️ Card ${card.id} không có members hợp lệ`);
                        return;
                    }

                    const actions = await getActionsByCard(card.id);
                    const resolution = calculateResolutionTime(actions);
                    console.log(new Date(actions[actions.length - 1].date));
                    if (resolution !== null) {
                        await postCards({
                            cardId: card.id,
                            cardName: card.name || "",
                            cardUrl: card.shortUrl || `https://trello.com/c/${card.idShort}`,
                            labels: card.labels?.map(l => l.name) || [],
                            resolutionTime: resolution.resolutionTime,
                            resolutionTimeTS: resolution.TSResolutionTime,
                            firstActionTime: resolution.firstActionTime,
                            members: card.idMembers || [],
                            createdAt: new Date(actions[actions.length - 1].date)
                        });
                    } else {
                        console.log(`⚠️ Card ${card.id} không có đủ dữ liệu để tính resolution time`);
                    }
                } catch (err) {
                    console.error(`❌ Lỗi xử lý card ${card.id}:`, err);
                }
            }));

            setProgress(Math.round(((i + batchSize) / total) * 100));
            setLog(`Đã xử lý ${Math.min(i + batchSize, total)} / ${total} cards`);
            await sleep(1500);
        }

        setLog("✅ Hoàn thành xử lý toàn bộ cards.");
        setIsLoading(false);
    };

    // Hàm xử lý Dev Cards
    const handleProcessDevCards = async () => {
        if (!selectedListId) {
            alert("Vui lòng chọn một list!");
            return;
        }

        setIsDevLoading(true);
        setDevProgress(0);
        setDevLog("Đang lấy dữ liệu dev cards...");

        let allCards = await getCardsByList(selectedListId);
        const total = allCards.length;
        const batchSize = 10;

        for (let i = 0; i < total; i += batchSize) {
            const batch = allCards.slice(i, i + batchSize);

            await Promise.all(batch.map(async (card) => {
                try {
                    const hasValidMembers = card.idMembers?.some(memberId => validMemberIds.has(memberId));
                    if (!hasValidMembers) {
                        console.log(`⚠️ Card ${card.id} không có members hợp lệ`);
                        return;
                    }

                    const actions = await getActionsByCard(card.id);
                    const resolution = calculateDevResolutionTime(actions);
                    if (resolution !== null) {
                        await postDevCards({
                            cardId: card.id,
                            cardName: card.name || "",
                            cardUrl: card.shortUrl || `https://trello.com/c/${card.idShort}`,
                            labels: card.labels?.map(l => l.name) || [],
                            resolutionTime: resolution.resolutionTime,
                            resolutionTimeDev: resolution.resolutionTimeDev,
                            firstActionTime: resolution.firstActionTime,
                            members: card.idMembers || [],
                            createdAt: new Date(actions[actions.length - 1].date)
                        });
                    } else {
                        console.log(`⚠️ Card ${card.id} không có đủ dữ liệu để tính resolution time`);
                    }
                } catch (err) {
                    console.error(`❌ Lỗi xử lý dev card ${card.id}:`, err);
                }
            }));

            setDevProgress(Math.round(((i + batchSize) / total) * 100));
            setDevLog(`Đã xử lý ${Math.min(i + batchSize, total)} / ${total} dev cards`);
            await sleep(1500);
        }

        setDevLog("✅ Hoàn thành xử lý toàn bộ dev cards.");
        setIsDevLoading(false);
        setSnackbar({
            open: true,
            message: "Đã xử lý xong tất cả dev cards!",
            severity: "success"
        });
    };

    const handleCloseModal = () => {
        setIsModalOpen(false);
        setSelectedCard(null);
        setCardActions(null);
    };

    const handleGetCardDetails = async () => {
        if (!cardIdInput.trim() || !apiKey.trim() || !token.trim()) {
            setSnackbar({
                open: true,
                message: "Vui lòng nhập đầy đủ Card ID, API Key và Token",
                severity: "warning"
            });
            return;
        }

        try {
            setIsLoading(true);
            const response = await fetch(`https://api.trello.com/1/cards/${cardIdInput.trim()}?key=${apiKey.trim()}&token=${token.trim()}`);
            if (!response.ok) {
                throw new Error('Không thể lấy thông tin card');
            }
            const data = await response.json();
            setCardDetails(data);
            setIsCardDetailsModalOpen(true);
        } catch (error) {
            console.error('Error fetching card details:', error);
            setSnackbar({
                open: true,
                message: error.message || "Có lỗi xảy ra khi lấy thông tin card",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseCardDetailsModal = () => {
        setIsCardDetailsModalOpen(false);
        setCardDetails(null);
    };

    const handleCopyCardDetailsJSON = () => {
        if (cardDetails) {
            navigator.clipboard.writeText(JSON.stringify(cardDetails, null, 2))
                .then(() => {
                    setSnackbar({
                        open: true,
                        message: "Đã sao chép JSON vào clipboard",
                        severity: "success"
                    });
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                    setSnackbar({
                        open: true,
                        message: "Không thể sao chép JSON",
                        severity: "error"
                    });
                });
        }
    };

    const handleGetActions = async () => {
        if (!cardIdInput.trim()) {
            setSnackbar({
                open: true,
                message: "Vui lòng nhập Card ID",
                severity: "warning"
            });
            return;
        }

        try {
            setIsLoading(true);
            const actions = await getActionsByCard(cardIdInput.trim());
            setCardActions(actions);
            setSelectedCard({ id: cardIdInput.trim(), name: "Custom Card" });
            setIsModalOpen(true);
        } catch (error) {
            console.error('Error fetching card actions:', error);
            setSnackbar({
                open: true,
                message: "Không thể lấy actions của card. Vui lòng kiểm tra lại ID.",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyJSON = () => {
        if (cardActions) {
            navigator.clipboard.writeText(JSON.stringify(cardActions, null, 2))
                .then(() => {
                    setSnackbar({
                        open: true,
                        message: "Đã sao chép JSON vào clipboard",
                        severity: "success"
                    });
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                    setSnackbar({
                        open: true,
                        message: "Không thể sao chép JSON",
                        severity: "error"
                    });
                });
        }
    };

    const handleGetBoardMembers = async () => {
        try {
            setIsLoading(true);
            const members = await getMembers();
            setBoardMembers(members);
            setIsMembersModalOpen(true);
        } catch (error) {
            console.error('Error fetching board members:', error);
            setSnackbar({
                open: true,
                message: "Không thể lấy danh sách members. Vui lòng thử lại.",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseMembersModal = () => {
        setIsMembersModalOpen(false);
        setBoardMembers(null);
    };

    const handleCopyMembersJSON = () => {
        if (boardMembers) {
            navigator.clipboard.writeText(JSON.stringify(boardMembers, null, 2))
                .then(() => {
                    setSnackbar({
                        open: true,
                        message: "Đã sao chép JSON vào clipboard",
                        severity: "success"
                    });
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                    setSnackbar({
                        open: true,
                        message: "Không thể sao chép JSON",
                        severity: "error"
                    });
                });
        }
    };

    const handleGetLists = async () => {
        try {
            setIsLoading(true);
            const lists = await getListsByBoardId("638d769884c52b05235a2310");
            // Chỉ lấy id và name của mỗi list
            const simplifiedLists = lists.map(list => ({
                id: list.id,
                name: list.name
            }));
            setListsData(simplifiedLists);
            setIsListsModalOpen(true);
        } catch (error) {
            console.error('Error fetching lists:', error);
            setSnackbar({
                open: true,
                message: "Không thể lấy danh sách lists. Vui lòng thử lại.",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseListsModal = () => {
        setIsListsModalOpen(false);
        setListsData(null);
    };

    const handleCopyListsJSON = () => {
        if (listsData) {
            navigator.clipboard.writeText(JSON.stringify(listsData, null, 2))
                .then(() => {
                    setSnackbar({
                        open: true,
                        message: "Đã sao chép JSON vào clipboard",
                        severity: "success"
                    });
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                    setSnackbar({
                        open: true,
                        message: "Không thể sao chép JSON",
                        severity: "error"
                    });
                });
        }
    };

    const handleGetLabels = async () => {
        try {
            setIsLoading(true);
            const labels = await getBoardLabels("638d769884c52b05235a2310");
            setBoardLabels(labels);
            setIsLabelsModalOpen(true);
        } catch (error) {
            console.error('Error fetching board labels:', error);
            setSnackbar({
                open: true,
                message: "Không thể lấy danh sách labels. Vui lòng thử lại.",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseLabelsModal = () => {
        setIsLabelsModalOpen(false);
        setBoardLabels(null);
    };

    const handleCopyLabelsJSON = () => {
        if (boardLabels) {
            navigator.clipboard.writeText(JSON.stringify(boardLabels, null, 2))
                .then(() => {
                    setSnackbar({
                        open: true,
                        message: "Đã sao chép JSON vào clipboard",
                        severity: "success"
                    });
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                    setSnackbar({
                        open: true,
                        message: "Không thể sao chép JSON",
                        severity: "error"
                    });
                });
        }
    };

    const handleUpdateUser = async () => {
        if (!updateUserData.email.trim()) {
            setSnackbar({
                open: true,
                message: "Vui lòng nhập email",
                severity: "warning"
            });
            return;
        }

        try {
            setIsLoading(true);
            await updateUser(updateUserData.email, {
                apiKey: updateUserData.apiKey,
                token: updateUserData.token
            });
            
            setSnackbar({
                open: true,
                message: "Cập nhật thông tin thành công!",
                severity: "success"
            });
            
            // Reset form
            setUpdateUserData({
                email: "",
                apiKey: "",
                token: ""
            });
        } catch (error) {
            console.error('Update user error:', error);
            setSnackbar({
                open: true,
                message: error.message || "Có lỗi xảy ra khi cập nhật thông tin",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };


    const handleCloseChannelsModal = () => {
        setIsChannelsModalOpen(false);
        setChannels(null);
    };

    const handleCopyChannelsJSON = () => {
        if (channels) {
            navigator.clipboard.writeText(JSON.stringify(channels, null, 2))
                .then(() => {
                    setSnackbar({
                        open: true,
                        message: "Đã sao chép JSON vào clipboard",
                        severity: "success"
                    });
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                    setSnackbar({
                        open: true,
                        message: "Không thể sao chép JSON",
                        severity: "error"
                    });
                });
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getLabelColor = (color) => {
        const colorMap = {
            'black_light': '#808080',
            'yellow_dark': '#FFA000',
            'sky_light': '#4FC3F7',
            'orange_light': '#FFB74D',
            'purple_light': '#CE93D8',
            'red_dark': '#D32F2F',
            'purple': '#9C27B0',
            'null': '#E0E0E0'
        };
        return colorMap[color] || '#E0E0E0';
    };

    // Thêm hàm upload ảnh
    const uploadImage = async (file) => {
        const formData = new FormData();
        formData.append('image', file);
        const res = await fetch('/api/upload', {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        return data.url; // server trả về { url: 'link ảnh' }
    };

    // Add these new functions after other function declarations

    const handleCloseStatsModal = () => {
      setIsStatsModalOpen(false);
    };

    const handleCopyStatsJSON = () => {
      if (appStats) {
        navigator.clipboard.writeText(JSON.stringify(appStats, null, 2))
          .then(() => {
            setSnackbar({
              open: true,
              message: "Đã sao chép JSON vào clipboard",
              severity: "success"
            });
          })
          .catch(err => {
            console.error('Failed to copy:', err);
            setSnackbar({
              open: true,
              message: "Không thể sao chép JSON",
              severity: "error"
            });
          });
      }
    };


    const handleCloseJsonModal = () => {
      setIsJsonModalOpen(false);
      setJsonData(null);
    };

    const handleCloseExportModal = () => {
        setIsExportModalOpen(false);
        setExportData(null);
    };

    const handleCopyExportData = () => {
        if (exportData) {
            navigator.clipboard.writeText(JSON.stringify(exportData, null, 2))
                .then(() => {
                    setSnackbar({
                        open: true,
                        message: "Đã sao chép JSON vào clipboard",
                        severity: "success"
                    });
                })
                .catch(err => {
                    console.error('Failed to copy:', err);
                    setSnackbar({
                        open: true,
                        message: "Không thể sao chép JSON",
                        severity: "error"
                    });
                });
        }
    };

    return (
        <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Phần xử lý cards */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Xử lý Cards
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel id="list-select-label">Chọn List</InputLabel>
                            <Select
                                labelId="list-select-label"
                                value={selectedListId}
                                label="Chọn List"
                                onChange={(e) => setSelectedListId(e.target.value)}
                            >
                                {lists.map((list) => (
                                    <MenuItem key={list.id} value={list.id}>
                                        {list.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        <Button 
                            variant="contained" 
                            onClick={handleProcess} 
                            disabled={isLoading}
                            sx={{ minWidth: 200 }}
                        >
                            Tính Resolution Time và Gửi lên API
                        </Button>
                    </Box>
                </Paper>

                {/* Section xử lý Dev Cards */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3, mt: 4 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Xử lý Dev Cards (Post Resolution Time)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel id="dev-list-select-label">Chọn List</InputLabel>
                            <Select
                                labelId="dev-list-select-label"
                                value={selectedListId}
                                label="Chọn List"
                                onChange={e => setSelectedListId(e.target.value)}
                            >
                                {lists.map((list) => (
                                    <MenuItem key={list.id} value={list.id}>
                                        {list.name}
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button
                            variant="contained"
                            onClick={handleProcessDevCards}
                            disabled={isDevLoading || !selectedListId}
                            sx={{ minWidth: 200 }}
                        >
                            Tính Resolution Time (Dev) và Gửi lên API
                        </Button>
                    </Box>
                </Paper>
                {isDevLoading && (
                    <Box sx={{ mt: 2 }}>
                        <Typography sx={{ mb: 1 }}>{devLog}</Typography>
                        <LinearProgress variant="determinate" value={devProgress} />
                    </Box>
                )}

                {/* Phần lấy Card Details */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Lấy Card Details
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Card ID"
                            value={cardIdInput}
                            onChange={(e) => setCardIdInput(e.target.value)}
                            fullWidth
                            placeholder="Nhập ID của card"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                        />
                        <TextField
                            label="API Key"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            fullWidth
                            placeholder="Nhập API Key"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                        />
                        <TextField
                            label="Token"
                            value={token}
                            onChange={(e) => setToken(e.target.value)}
                            fullWidth
                            placeholder="Nhập Token"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                        />
                        <Button 
                            variant="contained" 
                            onClick={handleGetCardDetails}
                            disabled={isLoading}
                            sx={{ 
                                minWidth: 120,
                                height: '56px',
                                borderRadius: 1
                            }}
                        >
                            Lấy Card Details
                        </Button>
                    </Box>
                </Paper>

                {/* Phần lấy actions theo ID */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Lấy Actions theo Card ID
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField
                            label="Card ID"
                            value={cardIdInput}
                            onChange={(e) => setCardIdInput(e.target.value)}
                            fullWidth
                            placeholder="Nhập ID của card"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                        />
                        <Button 
                            variant="contained" 
                            onClick={handleGetActions}
                            disabled={isLoading}
                            sx={{ 
                                minWidth: 120,
                                height: '56px',
                                borderRadius: 1
                            }}
                        >
                            Lấy Actions
                        </Button>
                    </Box>
                    {cardActions && (
                        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                                Số lượng actions:
                            </Typography>
                            <Chip 
                                label={cardActions.length} 
                                size="small"
                                sx={{ 
                                    backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                    color: 'primary.main',
                                    fontWeight: 500
                                }}
                            />
                        </Box>
                    )}
                </Paper>

                {/* Phần lấy board members */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Lấy Board Members
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button 
                            variant="contained" 
                            onClick={handleGetBoardMembers}
                            disabled={isLoading}
                            sx={{ 
                                minWidth: 200,
                                borderRadius: 1
                            }}
                        >
                            Lấy Board Members
                        </Button>
                    </Box>
                </Paper>

                {/* Phần lấy lists */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Lấy Board Lists
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button 
                            variant="contained" 
                            onClick={handleGetLists}
                            disabled={isLoading}
                            sx={{ 
                                minWidth: 200,
                                borderRadius: 1
                            }}
                        >
                            Lấy Board Lists
                        </Button>
                    </Box>
                </Paper>

                {/* Phần lấy board labels */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Lấy Board Labels
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        <Button 
                            variant="contained" 
                            onClick={handleGetLabels}
                            disabled={isLoading}
                            sx={{ 
                                minWidth: 200,
                                borderRadius: 1
                            }}
                        >
                            Lấy Board Labels
                        </Button>
                    </Box>
                </Paper>

                {/* Phần cập nhật thông tin user */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Cập nhật thông tin user
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Email"
                            type="email"
                            value={updateUserData.email}
                            onChange={(e) => setUpdateUserData({ ...updateUserData, email: e.target.value })}
                            fullWidth
                            placeholder="Nhập email của user"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                        />
                        <TextField
                            label="API Key"
                            value={updateUserData.apiKey}
                            onChange={(e) => setUpdateUserData({ ...updateUserData, apiKey: e.target.value })}
                            fullWidth
                            placeholder="Nhập API Key"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                        />
                        <TextField
                            label="Token"
                            value={updateUserData.token}
                            onChange={(e) => setUpdateUserData({ ...updateUserData, token: e.target.value })}
                            fullWidth
                            placeholder="Nhập Token"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                        />
                        <Button 
                            variant="contained" 
                            onClick={handleUpdateUser}
                            disabled={isLoading}
                            sx={{ 
                                alignSelf: 'flex-start',
                                minWidth: 120,
                                borderRadius: 1,
                                textTransform: 'none',
                                fontWeight: 'bold'
                            }}
                        >
                            Cập nhật
                        </Button>
                    </Box>
                </Paper>


                {isLoading && (
                    <Box sx={{ mt: 2 }}>
                        <Typography sx={{ mb: 1 }}>{log}</Typography>
                        <LinearProgress variant="determinate" value={progress} />
                    </Box>
                )}
            </Box>

            {/* Actions Modal */}
            <Dialog
                open={isModalOpen}
                onClose={handleCloseModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6">
                                Card Actions
                        </Typography>
                            {cardActions && (
                        <Chip 
                                    label={`${cardActions.length} actions`}
                            size="small" 
                            sx={{ 
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main',
                                        fontWeight: 500
                                    }}
                                />
                            )}
                    </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {cardActions && (
                                <Tooltip title="Copy JSON">
                                    <IconButton 
                                        onClick={handleCopyJSON}
                                        sx={{ 
                                            color: 'primary.main',
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1)
                                            }
                                        }}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <IconButton onClick={handleCloseModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {selectedCard && (
                        <Box sx={{ mb: 2 }}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 500 }}>
                                Card: {selectedCard.name}
                            </Typography>
                        </Box>
                    )}
                    {cardActions && (
                        <Paper 
                            sx={{ 
                                p: 2, 
                                backgroundColor: '#f5f5f5',
                                maxHeight: '60vh',
                                overflow: 'auto'
                            }}
                        >
                            <pre style={{ 
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word'
                            }}>
                                {JSON.stringify(cardActions, null, 2)}
                            </pre>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseModal}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Board Members Modal */}
            <Dialog
                open={isMembersModalOpen}
                onClose={handleCloseMembersModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                        <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6">
                                Board Members
                            </Typography>
                            {boardMembers && (
                                <Chip 
                                    label={`${boardMembers.length} members`}
                                    size="small"
                                    sx={{ 
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main',
                                        fontWeight: 500
                                    }}
                                />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {boardMembers && (
                                <Tooltip title="Copy JSON">
                                    <IconButton 
                                        onClick={handleCopyMembersJSON}
                                        sx={{ 
                                            color: 'primary.main',
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1)
                                            }
                                        }}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <IconButton onClick={handleCloseMembersModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {boardMembers && (
                        <Paper 
                            sx={{ 
                                p: 2, 
                                backgroundColor: '#f5f5f5',
                                maxHeight: '60vh',
                                overflow: 'auto'
                            }}
                        >
                            <pre style={{ 
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word'
                            }}>
                                {JSON.stringify(boardMembers, null, 2)}
                            </pre>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseMembersModal}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Lists Modal */}
            <Dialog
                open={isListsModalOpen}
                onClose={handleCloseListsModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6">
                                Board Lists
                            </Typography>
                            {listsData && (
                                <Chip 
                                    label={`${listsData.length} lists`}
                                    size="small"
                                    sx={{ 
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main',
                                        fontWeight: 500
                                    }}
                                />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {listsData && (
                                <Tooltip title="Copy JSON">
                                    <IconButton 
                                        onClick={handleCopyListsJSON}
                                        sx={{ 
                                            color: 'primary.main',
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1)
                                            }
                                        }}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <IconButton onClick={handleCloseListsModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {listsData && (
                        <Paper 
                            sx={{ 
                                p: 2, 
                                backgroundColor: '#f5f5f5',
                                maxHeight: '60vh',
                                overflow: 'auto'
                            }}
                        >
                            <pre style={{ 
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word'
                            }}>
                                {JSON.stringify(listsData, null, 2)}
                            </pre>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseListsModal}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Labels Modal */}
            <Dialog
                open={isLabelsModalOpen}
                onClose={handleCloseLabelsModal}
                maxWidth="md"
                                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6">
                                Board Labels
                            </Typography>
                            {boardLabels && (
                                <Chip 
                                    label={`${boardLabels.length} labels`}
                                    size="small"
                                    sx={{ 
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main',
                                        fontWeight: 500
                                    }}
                                />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {boardLabels && (
                                <Tooltip title="Copy JSON">
                                    <IconButton 
                                        onClick={handleCopyLabelsJSON}
                                sx={{
                                            color: 'primary.main',
                                        '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1)
                                            }
                                        }}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <IconButton onClick={handleCloseLabelsModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {boardLabels && (
                        <Paper 
                            sx={{ 
                                p: 2, 
                                backgroundColor: '#f5f5f5',
                                maxHeight: '60vh',
                                overflow: 'auto'
                            }}
                        >
                            <pre style={{ 
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word'
                            }}>
                                {JSON.stringify(boardLabels, null, 2)}
                            </pre>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseLabelsModal}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Card Details Modal */}
            <Dialog
                open={isCardDetailsModalOpen}
                onClose={handleCloseCardDetailsModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                    }}>
                        <Typography variant="h6">
                            Card Details
                        </Typography>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {cardDetails && (
                                <Tooltip title="Copy JSON">
                                    <IconButton 
                                        onClick={handleCopyCardDetailsJSON}
                                        sx={{ 
                                            color: 'primary.main',
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1)
                                            }
                                        }}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <IconButton onClick={handleCloseCardDetailsModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {cardDetails && (
                        <Paper 
                            sx={{ 
                                p: 2, 
                                backgroundColor: '#f5f5f5',
                                maxHeight: '60vh',
                                overflow: 'auto'
                            }}
                        >
                            <pre style={{ 
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word'
                            }}>
                                {JSON.stringify(cardDetails, null, 2)}
                            </pre>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseCardDetailsModal}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Channels Modal */}
            <Dialog
                open={isChannelsModalOpen}
                onClose={handleCloseChannelsModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6">
                                Slack Channels
                            </Typography>
                            {channels && (
                                <Chip 
                                    label={`${channels.length} channels`}
                                    size="small"
                                    sx={{ 
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main',
                                        fontWeight: 500
                                    }}
                                />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {channels && (
                                <Tooltip title="Copy JSON">
                                    <IconButton 
                                        onClick={handleCopyChannelsJSON}
                                        sx={{ 
                                            color: 'primary.main',
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1)
                                            }
                                        }}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <IconButton onClick={handleCloseChannelsModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {channels && (
                        <Paper 
                            sx={{ 
                                p: 2, 
                                backgroundColor: '#f5f5f5',
                                maxHeight: '60vh',
                                overflow: 'auto'
                            }}
                        >
                            <pre style={{ 
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word'
                            }}>
                                {JSON.stringify(channels, null, 2)}
                            </pre>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseChannelsModal}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Stats Modal */}
            <Dialog
                open={isStatsModalOpen}
                onClose={handleCloseStatsModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6">
                                Thống kê App
                            </Typography>
                            {appStats && (
                                <Chip 
                                    label={`${Object.keys(appStats).length} apps`}
                                    size="small"
                                    sx={{ 
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main',
                                        fontWeight: 500
                                    }}
                                />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {appStats && (
                                <Tooltip title="Copy JSON">
                                    <IconButton
                                        onClick={handleCopyStatsJSON}
                                        sx={{ 
                                            color: 'primary.main',
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1)
                                            }
                                        }}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <IconButton onClick={handleCloseStatsModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {appStats && (
                        <Paper 
                            sx={{ 
                                p: 2, 
                                backgroundColor: '#f5f5f5',
                                maxHeight: '60vh',
                                overflow: 'auto'
                            }}
                        >
                            <pre style={{ 
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word'
                            }}>
                                {JSON.stringify(appStats, null, 2)}
                            </pre>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseStatsModal}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* JSON Modal */}
            <Dialog
                open={isJsonModalOpen}
                onClose={handleCloseJsonModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6">
                                JSON Data
                            </Typography>
                            {jsonData?.points > 0 && (
                                <Chip 
                                    label={`${jsonData.points} points`}
                                    color="primary"
                                    sx={{ 
                                        fontWeight: 'bold',
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        color: theme.palette.primary.main
                                    }}
                                />
                            )}
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {jsonData && (
                        <Paper 
                            sx={{ 
                                p: 2, 
                                backgroundColor: '#f5f5f5',
                                maxHeight: '60vh',
                                overflow: 'auto'
                            }}
                        >
                            <pre style={{ 
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                                fontFamily: 'monospace',
                                fontSize: '14px',
                                lineHeight: '1.5'
                            }}>
                                {JSON.stringify(jsonData, null, 2)}
                            </pre>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseJsonModal}>Close</Button>
                </DialogActions>
            </Dialog>

            {/* Export Modal */}
            <Dialog
                open={isExportModalOpen}
                onClose={handleCloseExportModal}
                maxWidth="md"
                fullWidth
            >
                <DialogTitle>
                    <Box sx={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center' 
                    }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Typography variant="h6">
                                Thống kê App
                            </Typography>
                            {exportData && (
                                <Chip 
                                    label={`${exportData.length} apps`}
                                    size="small"
                                    sx={{ 
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main',
                                        fontWeight: 500
                                    }}
                                />
                            )}
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            {exportData && (
                                <Tooltip title="Copy JSON">
                                    <IconButton 
                                        onClick={handleCopyExportData}
                                        sx={{ 
                                            color: 'primary.main',
                                            '&:hover': {
                                                backgroundColor: alpha(theme.palette.primary.main, 0.1)
                                            }
                                        }}
                                    >
                                        <ContentCopyIcon />
                                    </IconButton>
                                </Tooltip>
                            )}
                            <IconButton onClick={handleCloseExportModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {exportData && (
                        <Paper 
                            sx={{ 
                                p: 2, 
                                backgroundColor: '#f5f5f5',
                                maxHeight: '60vh',
                                overflow: 'auto'
                            }}
                        >
                            <pre style={{ 
                                margin: 0,
                                whiteSpace: 'pre-wrap',
                                wordWrap: 'break-word',
                                fontFamily: 'monospace',
                                fontSize: '14px',
                                lineHeight: '1.5'
                            }}>
                                {JSON.stringify(exportData, null, 2)}
                            </pre>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseExportModal}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Thêm button mở dialog tạo conversation */}

            {/* Dialog tạo conversation */}

            {/* Form tạo conversation */}
        </Box>
    );
};

export default DevZone;
