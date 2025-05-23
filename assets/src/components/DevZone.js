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
    Alert,
    Snackbar,
    Autocomplete,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    IconButton,
    Chip,
    Tooltip,
    Grid
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
import { register, updateUser } from "../api/usersApi";
import { saveWorkShift } from "../api/workShiftApi";
import members from "../data/members.json";
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { alpha } from '@mui/material/styles';
import { useTheme } from '@mui/material/styles';
import SendIcon from '@mui/icons-material/Send';
import ListIcon from '@mui/icons-material/List';
import { getChannelId, sendMessageToChannel } from "../api/slackApi";
import AddIcon from '@mui/icons-material/Add';

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

const DevZone = () => {
    const [progress, setProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [log, setLog] = useState("");
    const [lists, setLists] = useState([]);
    const [selectedListId, setSelectedListId] = useState("");
    const [registerData, setRegisterData] = useState({
        email: "",
        password: "",
        name: "",
        role: "user",
        trelloId: ""
    });
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
    const [slackMessage, setSlackMessage] = useState('');
    const [isSendingSlack, setIsSendingSlack] = useState(false);
    const [channels, setChannels] = useState(null);
    const [isChannelsModalOpen, setIsChannelsModalOpen] = useState(false);
    const [isLoadingChannels, setIsLoadingChannels] = useState(false);
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [workShifts, setWorkShifts] = useState([
        {
            shiftName: "",
            tsMembers: []
        }
    ]);
    const theme = useTheme();

    // Tạo Set chứa các member ID hợp lệ
    const validMemberIds = new Set(members.map(m => m.id));

    // Format members data for Autocomplete
    const memberOptions = members.map(member => ({
        id: member.id,
        label: `${member.name} (${member.id})`
    }));

    // Filter TS members
    const tsMembers = members.filter(member => 
        member.role?.toLowerCase() === 'ts' || 
        member.role?.toLowerCase() === 'ts-lead'
    );

    // Format members for Autocomplete
    const tsMemberOptions = tsMembers.map(member => ({
        id: member.id,
        label: `${member.username} (${member.role})`,
        name: member.username,
        role: member.role,
        slackId: member.slackId
    }));

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

    const handleRegister = async () => {
        try {
            setIsLoading(true);
            setLog("Đang đăng ký tài khoản...");
            
            // Log registerData trước khi gửi
            console.log('Register data before sending:', registerData);
            
            const response = await register(registerData);
            console.log('Register response:', response);
            
            setLog("✅ Đăng ký thành công!");
            setRegisterData({
                email: "",
                password: "",
                name: "",
                role: "user",
                trelloId: ""
            });
            setSnackbar({
                open: true,
                message: "Đăng ký tài khoản thành công!",
                severity: "success"
            });
        } catch (error) {
            console.error('Register error:', error);
            setLog(`❌ Lỗi đăng ký: ${error.message}`);
            setSnackbar({
                open: true,
                message: error.message || "Có lỗi xảy ra khi đăng ký",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseSnackbar = () => {
        setSnackbar({ ...snackbar, open: false });
    };

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

    const handleCardClick = async (card) => {
        try {
            setSelectedCard(card);
            const actions = await getActionsByCard(card.id);
            setCardActions(actions);
            setIsModalOpen(true);
        } catch (error) {
            console.error('Error fetching card actions:', error);
        }
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
            const result = await updateUser(updateUserData.email, {
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

    const handleSendSlackMessage = async () => {
        if (!slackMessage.trim()) {
            setSnackbar({
                open: true,
                message: "Vui lòng nhập nội dung tin nhắn",
                severity: "warning"
            });
            return;
        }

        try {
            const response = await sendMessageToChannel(slackMessage);
            setSnackbar({
                open: true,
                message: "Đã gửi tin nhắn đến Slack thành công!",
                severity: "success"
            });
            setSlackMessage('');    
        } catch (error) {
            console.error('Error sending Slack message:', error);
            setSnackbar({
                open: true,
                message: error.message || "Có lỗi xảy ra khi gửi tin nhắn",
                severity: "error"
            });
        } finally {
            setIsSendingSlack(false);
        }
    };

    const handleGetChannels = async () => {
        try {
            setIsLoadingChannels(true);
            const data = await getChannelId();
            setChannels(data);
            setIsChannelsModalOpen(true);
        } catch (error) {
            console.error('Error fetching channels:', error);
            setSnackbar({
                open: true,
                message: error.message || "Có lỗi xảy ra khi lấy danh sách channels",
                severity: "error"
            });
        } finally {
            setIsLoadingChannels(false);
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

    const handleAddShift = () => {
        setWorkShifts([
            ...workShifts,
            {
                shiftName: "",
                tsMembers: []
            }
        ]);
    };

    const handleRemoveShift = (index) => {
        if (workShifts.length > 1) {
            setWorkShifts(workShifts.filter((_, i) => i !== index));
        }
    };

    const handleShiftChange = (index, field, value) => {
        const newShifts = [...workShifts];
        if (field === 'tsMembers') {
            const validMembers = Array.isArray(value) 
                ? value.filter(member => member && member.id)
                : [];
            newShifts[index] = {
                ...newShifts[index],
                [field]: validMembers
            };
        } else {
            newShifts[index] = {
                ...newShifts[index],
                [field]: value
            };
        }
        setWorkShifts(newShifts);
    };

    const handleSaveWorkShift = async () => {
        try {
            setIsLoading(true);
            
            // Validate data before sending
            const validShifts = workShifts.filter(shift => 
                shift.shiftName && 
                Array.isArray(shift.tsMembers) && 
                shift.tsMembers.length > 0
            );

            if (validShifts.length === 0) {
                throw new Error('Vui lòng nhập đầy đủ thông tin cho ít nhất một ca trực');
            }

            // Format data as an array of shifts with date
            const workShiftData = validShifts.map(shift => ({
                date: selectedDate,
                shiftName: shift.shiftName,
                tsMembers: shift.tsMembers.map(member => ({
                    slackId: member.slackId,
                    trelloId: member.id
                }))
            }));

            console.log('Sending data:', workShiftData);
            const response = await saveWorkShift(workShiftData);
            
            setSnackbar({
                open: true,
                message: "Lưu ca làm việc thành công!",
                severity: "success"
            });

            // Reset form but keep the date
            setWorkShifts([{
                shiftName: "",
                tsMembers: []
            }]);
        } catch (error) {
            console.error('Error saving work shift:', error);
            setSnackbar({
                open: true,
                message: error.message || "Có lỗi xảy ra khi lưu ca làm việc",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Work Shift Management Section */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Quản lý ca làm việc
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Date Selection */}
                        <TextField
                            type="date"
                            label="Chọn ngày"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            fullWidth
                            InputLabelProps={{
                                shrink: true,
                            }}
                        />

                        {/* Shifts */}
                        {workShifts.map((shift, index) => (
                            <Box key={index} sx={{ 
                                p: 2, 
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                position: 'relative'
                            }}>
                                {workShifts.length > 1 && (
                                    <IconButton
                                        onClick={() => handleRemoveShift(index)}
                                        sx={{
                                            position: 'absolute',
                                            right: 8,
                                            top: 8,
                                            color: 'error.main'
                                        }}
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                )}
                                <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold' }}>
                                    Ca trực {index + 1}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                                    <TextField
                                        label="Tên ca trực"
                                        value={shift.shiftName}
                                        onChange={(e) => handleShiftChange(index, 'shiftName', e.target.value)}
                                        fullWidth
                                        placeholder="Nhập tên ca trực"
                                    />
                                </Box>

                                <Autocomplete
                                    multiple
                                    options={tsMemberOptions}
                                    getOptionLabel={(option) => option.label}
                                    value={shift.tsMembers}
                                    onChange={(event, newValue) => {
                                        handleShiftChange(index, 'tsMembers', newValue);
                                    }}
                                    renderInput={(params) => (
                                        <TextField
                                            {...params}
                                            label="Chọn TS"
                                            fullWidth
                                            placeholder="Chọn TS cho ca trực"
                                        />
                                    )}
                                    renderOption={(props, option) => (
                                        <li {...props}>
                                            <Box>
                                                <Typography variant="body1">{option.name}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {option.role}
                                                </Typography>
                                            </Box>
                                        </li>
                                    )}
                                />
                            </Box>
                        ))}

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button 
                                variant="outlined" 
                                onClick={handleAddShift}
                                startIcon={<AddIcon />}
                                sx={{ 
                                    minWidth: 120,
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 'bold'
                                }}
                            >
                                Thêm ca trực
                            </Button>

                            <Button 
                                variant="contained" 
                                onClick={handleSaveWorkShift}
                                disabled={isLoading}
                                sx={{ 
                                    minWidth: 120,
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 'bold'
                                }}
                            >
                                Lưu ca làm việc
                            </Button>
                        </Box>
                    </Box>
                </Paper>

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

                {/* Phần đăng ký tài khoản */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Thêm tài khoản mới
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Email"
                                type="email"
                                value={registerData.email}
                                onChange={(e) => setRegisterData({ ...registerData, email: e.target.value })}
                                fullWidth
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                            />
                            <TextField
                                label="Mật khẩu"
                                type="password"
                                value={registerData.password}
                                onChange={(e) => setRegisterData({ ...registerData, password: e.target.value })}
                                fullWidth
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <TextField
                                label="Họ tên"
                                value={registerData.name}
                                onChange={(e) => setRegisterData({ ...registerData, name: e.target.value })}
                                fullWidth
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                            />
                            <FormControl fullWidth>
                                <InputLabel>Vai trò</InputLabel>
                                <Select
                                    value={registerData.role}
                                    label="Vai trò"
                                    onChange={(e) => setRegisterData({ ...registerData, role: e.target.value })}
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                                >
                                    <MenuItem value="user">User</MenuItem>
                                    <MenuItem value="admin">Admin</MenuItem>
                                </Select>
                            </FormControl>
                        </Box>
                        <Autocomplete
                            options={memberOptions}
                            getOptionLabel={(option) => option.label}
                            value={memberOptions.find(option => option.id === registerData.trelloId) || null}
                            onChange={(event, newValue) => {
                                setRegisterData({
                                    ...registerData,
                                    trelloId: newValue ? newValue.id : "",
                                    name: newValue ? members.find(m => m.id === newValue.id)?.name || registerData.name : registerData.name
                                });
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Trello ID"
                                    fullWidth
                                    sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                                />
                            )}
                            sx={{ width: '100%' }}
                        />
                        <Button 
                            variant="contained" 
                            onClick={handleRegister} 
                            disabled={isLoading}
                            sx={{ 
                                alignSelf: 'flex-start',
                                minWidth: 120,
                                borderRadius: 1,
                                textTransform: 'none',
                                fontWeight: 'bold'
                            }}
                        >
                            Đăng ký
                        </Button>
                    </Box>
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

                {/* Phần gửi tin nhắn Slack */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Gửi tin nhắn đến Slack
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Nội dung tin nhắn"
                            value={slackMessage}
                            onChange={(e) => setSlackMessage(e.target.value)}
                            fullWidth
                            multiline
                            rows={4}
                            placeholder="Nhập nội dung tin nhắn cần gửi đến Slack..."
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                        />
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button 
                                variant="contained" 
                                onClick={handleSendSlackMessage}
                                disabled={isSendingSlack}
                                startIcon={<SendIcon />}
                                sx={{ 
                                    minWidth: 120,
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 'bold',
                                    backgroundColor: '#4A154B',
                                    '&:hover': {
                                        backgroundColor: '#3a1039'
                                    }
                                }}
                            >
                                {isSendingSlack ? 'Đang gửi...' : 'Gửi đến Slack'}
                            </Button>
                            <Button 
                                variant="outlined" 
                                onClick={handleGetChannels}
                                disabled={isLoadingChannels}
                                startIcon={<ListIcon />}
                                sx={{ 
                                    minWidth: 120,
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 'bold',
                                    borderColor: '#4A154B',
                                    color: '#4A154B',
                                    '&:hover': {
                                        borderColor: '#3a1039',
                                        backgroundColor: alpha('#4A154B', 0.1)
                                    }
                                }}
                            >
                                {isLoadingChannels ? 'Đang tải...' : 'Xem Channels'}
                            </Button>
                        </Box>
                    </Box>
                </Paper>

                {isLoading && (
                    <Box sx={{ mt: 2 }}>
                        <Typography sx={{ mb: 1 }}>{log}</Typography>
                        <LinearProgress variant="determinate" value={progress} />
                    </Box>
                )}
            </Box>

            <Snackbar 
                open={snackbar.open} 
                autoHideDuration={6000} 
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
            >
                <Alert 
                    onClose={handleCloseSnackbar} 
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>

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
        </Box>
    );
};

export default DevZone;
