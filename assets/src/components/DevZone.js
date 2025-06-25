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
    Link,
    Avatar
} from "@mui/material";
import {
    getCardsByList,
    getActionsByCard,
    getListsByBoardId,
    getMembers,
    getBoardLabels,
    searchCards
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
import { createLeaderboard } from "../api/leaderboardApi";
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import { createConversation } from "../api/crispApi";

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
            tsMembers: [],
            csMembers: []
        }
    ]);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState(null);
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [leaderboardData, setLeaderboardData] = useState({
        month: new Date().getMonth() + 1,
        year: new Date().getFullYear(),
        points: members.filter(member => 
            member.role?.toLowerCase() === 'ts' || 
            member.role?.toLowerCase() === 'ts-lead' ||
            member.role?.toLowerCase() === 'cs'
        ).map(member => ({
            memberId: member.id,
            points: 1000
        }))
    });
    const [appStats, setAppStats] = useState({});
    const [isLoadingStats, setIsLoadingStats] = useState(false);
    const theme = useTheme();

    // Tạo Set chứa các member ID hợp lệ
    const validMemberIds = new Set(members.map(m => m.id));

    // Format members data for Autocomplete
    const memberOptions = members.map(member => ({
        id: member.id,
        label: `${member.name} (${member.id})`
    }));

    // Filter TS members from members.json
    const tsMembers = members.filter(member => 
        member.role?.toLowerCase() === 'ts' || 
        member.role?.toLowerCase() === 'ts-lead'
    );

    // Filter CS members from members.json
    const csMembers = members.filter(member => 
        member.role?.toLowerCase() === 'cs'
    );

    // Format TS members for Autocomplete
    const tsMemberOptions = tsMembers.map(member => ({
        id: member.id,
        label: `${member.username} (${member.role})`,
        name: member.username,
        role: member.role,
        slackId: member.slackId
    }));

    // Format CS members for Autocomplete
    const csMemberOptions = csMembers.map(member => ({
        id: member.id,
        label: `${member.username} (${member.role})`,
        name: member.username,
        role: member.role,
        slackId: member.slackId
    }));

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
    const [conversationDialog, setConversationDialog] = useState(false);

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
            await sendMessageToChannel(slackMessage);
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
                tsMembers: [],
                csMembers: []
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
        } else if (field === 'csMembers') {
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
                Array.isArray(shift.csMembers) && 
                (shift.tsMembers.length > 0 || shift.csMembers.length > 0)
            );

            if (validShifts.length === 0) {
                throw new Error('Vui lòng nhập đầy đủ thông tin cho ít nhất một ca trực');
            }

            // Format data as an array of shifts with date
            const workShiftData = validShifts.map(shift => ({
                date: selectedDate,
                shiftName: shift.shiftName,
                tsMembers: shift.tsMembers.map(member => {
                    // Lấy group từ members.json nếu có
                    const memberData = members.find(m => m.id === member.id);
                    return {
                        slackId: member.slackId,
                        trelloId: member.id,
                        group: memberData && memberData.group ? memberData.group : undefined
                    };
                }),
                csMembers: shift.csMembers.map(member => {
                    // Lấy group từ members.json nếu có
                    const memberData = members.find(m => m.id === member.id);
                    return {
                        slackId: member.slackId,
                        trelloId: member.id,
                        group: memberData && memberData.group ? memberData.group : undefined
                    };
                })
            }));

            console.log('Sending data:', workShiftData);
            await saveWorkShift(workShiftData);
            
            setSnackbar({
                open: true,
                message: "Lưu ca làm việc thành công!",
                severity: "success"
            });

            // Reset form but keep the date
            setWorkShifts([{
                shiftName: "",
                tsMembers: [],
                csMembers: []
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

    const handleSearchCards = async () => {
        if (!searchQuery.trim()) {
            setSnackbar({
                open: true,
                message: "Vui lòng nhập từ khóa tìm kiếm",
                severity: "warning"
            });
            return;
        }

        try {
            setIsLoading(true);
            const results = await searchCards(searchQuery);
            console.log(results);
            setSearchResults(results);
            setIsSearchModalOpen(true);
        } catch (error) {
            console.error('Error searching cards:', error);
            setSnackbar({
                open: true,
                message: error.message || "Có lỗi xảy ra khi tìm kiếm cards",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseSearchModal = () => {
        setIsSearchModalOpen(false);
        setSearchResults(null);
    };

    const handleCopySearchResultsJSON = () => {
        if (searchResults) {
            navigator.clipboard.writeText(JSON.stringify(searchResults, null, 2))
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

    const handleAddPoints = () => {
        setLeaderboardData(prev => ({
            ...prev,
            points: [...prev.points, { memberId: '', points: 1000 }]
        }));
    };

    const handleRemovePoints = (index) => {
        setLeaderboardData(prev => ({
            ...prev,
            points: prev.points.filter((_, i) => i !== index)
        }));
    };

    const handlePointsChange = (index, field, value) => {
        setLeaderboardData(prev => ({
            ...prev,
            points: prev.points.map((point, i) => 
                i === index ? { ...point, [field]: value } : point
            )
        }));
    };

    const handleSavePoints = async () => {
        try {
            setIsLoading(true);
            console.log('Leaderboard data:', leaderboardData);
            await createLeaderboard(leaderboardData);
            setSnackbar({
                open: true,
                message: "Lưu điểm thành công!",
                severity: "success"
            });
        } catch (error) {
            console.error('Error saving points:', error);
            setSnackbar({
                open: true,
                message: error.message || "Có lỗi xảy ra khi lưu điểm",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
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

    const handleAvatarChange = async (index, file) => {
        try {
            const url = await uploadImage(file);
            setLeaderboardData(prev => ({
                ...prev,
                points: prev.points.map((point, i) =>
                    i === index ? { ...point, avatarUrl: url } : point
                )
            }));
        } catch (err) {
            setSnackbar({
                open: true,
                message: 'Upload ảnh thất bại!',
                severity: 'error'
            });
        }
    };


    const handleGetAppStats = async () => {
        // Validate list IDs
        const validListIds = listIds.filter(id => id.trim() !== '');
        if (validListIds.length === 0) {
            setSnackbar({
                open: true,
                message: "Vui lòng nhập ít nhất một List ID",
                severity: "warning"
            });
            return;
        }

        setIsLoadingStats(true);
        try {
            // Get cards from all lists
            const allCards = [];
            for (const listId of validListIds) {
                console.log('Fetching cards for list:', listId);
                const cards = await getCardsByList(listId);
                console.log('Cards received:', cards);
                if (Array.isArray(cards)) {
                    allCards.push(...cards);
                }
            }

            console.log('Total cards collected:', allCards.length);

            const stats = {};

            allCards.forEach(card => {
                // Tìm label App và Level
                const appLabel = card.labels?.find(label => label.name.startsWith('App:'));
                const levelLabel = card.labels?.find(label => 
                    label.name.toLowerCase().startsWith('issue: level') || 
                    label.name.toLowerCase().startsWith('issues: level')
                );

                if (appLabel) {
                    const appName = appLabel.name; // Giữ nguyên "App:" trong tên
                    if (!stats[appName]) {
                        stats[appName] = {
                            totalCards: 0,
                            levels: {
                                'Level 0': 0,
                                'Level 1': 0,
                                'Level 2': 0,
                                'Level 3': 0,
                                'Level 4': 0
                            }
                        };
                    }

                    stats[appName].totalCards++;
                    if (levelLabel) {
                        // Extract level number from label name
                        const levelMatch = levelLabel.name.match(/level\s*(\d+)/i);
                        if (levelMatch) {
                            const levelNum = levelMatch[1];
                            const levelKey = `Level ${levelNum}`;
                            if (stats[appName].levels.hasOwnProperty(levelKey)) {
                                stats[appName].levels[levelKey]++;
                            }
                        }
                    }
                }
            });

            console.log('Final stats:', stats);
            setAppStats(stats);
            setSnackbar({
                open: true,
                message: "Đã lấy thống kê thành công!",
                severity: "success"
            });
        } catch (error) {
            console.error('Error fetching app stats:', error);
            setSnackbar({
                open: true,
                message: "Có lỗi xảy ra khi lấy thống kê",
                severity: "error"
            });
        } finally {
            setIsLoadingStats(false);
        }
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

    const handleExportStats = () => {
        if (!appStats || Object.keys(appStats).length === 0) {
            setSnackbar({
                open: true,
                message: "Không có dữ liệu để xuất",
                severity: "warning"
            });
            return;
        }

        // Format data for export
        const formattedData = Object.entries(appStats).map(([appName, stats]) => ({
            app: appName,
            totalCards: stats.totalCards,
            levels: Object.entries(stats.levels)
                .filter(([_, count]) => count > 0)
                .reduce((acc, [level, count]) => {
                    acc[level] = count;
                    return acc;
                }, {})
        }));

        setExportData(formattedData);
        setIsExportModalOpen(true);
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

    const handleAddList = () => {
        setListIds([...listIds, '']);
    };

    const handleRemoveList = (index) => {
        if (listIds.length > 1) {
            setListIds(listIds.filter((_, i) => i !== index));
        }
    };

    const handleListChange = (index, value) => {
        const newListIds = [...listIds];
        newListIds[index] = value;
        setListIds(newListIds);
    };

    const handleOpenConversationDialog = () => {
        setConversationDialog(true);
    };

    const handleCloseConversationDialog = () => {
        setConversationDialog(false);
        setConversationNote('');
    };

    const handleCreateConversation = async () => {
        if (!conversationNote.trim()) {
            setSnackbar({
                open: true,
                message: 'Vui lòng nhập note cho conversation!',
                severity: 'warning'
            });
            return;
        }

        try {
            await createConversation(conversationNote);
            
            setSnackbar({
                open: true,
                message: 'Tạo conversation thành công!',
                severity: 'success'
            });
            setConversationNote(''); // Reset note sau khi tạo thành công
        } catch (error) {
            console.error('Error creating conversation:', error);
            setSnackbar({
                open: true,
                message: 'Lỗi khi tạo conversation: ' + error.message,
                severity: 'error'
            });
        }
    };

    return (
        <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Work Shift Management Section */}
                <Paper sx={{
                    p: 4,
                    borderRadius: 3,
                    boxShadow: '0 8px 32px rgba(25,118,210,0.10)',
                    background: 'linear-gradient(135deg, #fafdff 0%, #e3f0ff 100%)',
                    border: '1px solid #e3eafc',
                    mb: 2
                }}>
                    <Box sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        mb: 4,
                        pb: 2,
                        borderBottom: '2px solid #1976d2',
                        background: 'linear-gradient(90deg, #e3f0ff 0%, #fafdff 100%)',
                        borderRadius: 2
                    }}>
                        <Typography variant="h5" sx={{
                            color: '#1976d2',
                            fontWeight: 'bold',
                            textShadow: '0 1px 2px rgba(25,118,210,0.08)'
                        }}>
                            Quản lý ca làm việc (TS & CS)
                        </Typography>
                        <Chip
                            label="Work Shift Management"
                            size="small"
                            sx={{
                                backgroundColor: 'rgba(25, 118, 210, 0.12)',
                                color: '#1976d2',
                                fontWeight: 'bold',
                                letterSpacing: 1
                            }}
                        />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {/* Date Selection */}
                        <Box sx={{
                            p: 3,
                            borderRadius: 2,
                            backgroundColor: 'rgba(25, 118, 210, 0.04)',
                            border: '1px solid #e3eafc',
                            boxShadow: '0 2px 8px rgba(25,118,210,0.04)'
                        }}>
                            <Typography variant="subtitle1" sx={{
                                mb: 2,
                                fontWeight: 'bold',
                                color: '#1976d2',
                                letterSpacing: 0.5
                            }}>
                                📅 Chọn ngày làm việc
                            </Typography>
                            <TextField
                                type="date"
                                label="Ngày"
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                                sx={{
                                    '& .MuiOutlinedInput-root': {
                                        borderRadius: 2,
                                        backgroundColor: 'white',
                                        '&:hover': {
                                            backgroundColor: 'rgba(25, 118, 210, 0.02)'
                                        }
                                    }
                                }}
                            />
                        </Box>

                        {/* Shifts */}
                        {workShifts.map((shift, index) => (
                            <Box key={index} sx={{
                                p: 3,
                                border: '2px solid',
                                borderColor: index % 2 === 0 ? '#b6d0fa' : '#b9f6ca',
                                borderRadius: 3,
                                position: 'relative',
                                background: index % 2 === 0
                                    ? 'linear-gradient(135deg, #e3f0ff 0%, #fafdff 100%)'
                                    : 'linear-gradient(135deg, #e8f5e9 0%, #fafdff 100%)',
                                boxShadow: '0 4px 20px rgba(25,118,210,0.06)',
                                transition: 'all 0.3s',
                                '&:hover': {
                                    transform: 'translateY(-2px)',
                                    boxShadow: '0 8px 25px rgba(25,118,210,0.12)'
                                },
                                mb: 2
                            }}>
                                {workShifts.length > 1 && (
                                    <IconButton
                                        onClick={() => handleRemoveShift(index)}
                                        sx={{
                                            position: 'absolute',
                                            right: 12,
                                            top: 12,
                                            color: 'error.main',
                                            backgroundColor: 'rgba(244, 67, 54, 0.08)',
                                            '&:hover': {
                                                backgroundColor: 'rgba(244, 67, 54, 0.18)'
                                            }
                                        }}
                                    >
                                        <CloseIcon />
                                    </IconButton>
                                )}

                                <Box sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 2,
                                    mb: 3,
                                    pb: 2,
                                    borderBottom: '1px solid #e3eafc'
                                }}>
                                    <Box sx={{
                                        width: 40,
                                        height: 40,
                                        borderRadius: '50%',
                                        backgroundColor: index % 2 === 0 ? '#1976d2' : '#4caf50',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'white',
                                        fontWeight: 'bold',
                                        fontSize: '1.2rem',
                                        boxShadow: '0 2px 8px rgba(25,118,210,0.10)'
                                    }}>
                                        {index + 1}
                                    </Box>
                                    <Typography variant="h6" sx={{
                                        fontWeight: 'bold',
                                        color: index % 2 === 0 ? '#1976d2' : '#4caf50',
                                        letterSpacing: 0.5
                                    }}>
                                        Ca trực {index + 1}
                                    </Typography>
                                </Box>

                                <Box sx={{ display: 'flex', gap: 3, mb: 3 }}>
                                    <TextField
                                        label="Tên ca trực"
                                        value={shift.shiftName}
                                        onChange={(e) => handleShiftChange(index, 'shiftName', e.target.value)}
                                        fullWidth
                                        placeholder="Nhập tên ca trực (VD: Ca sáng, Ca chiều, Ca đêm)"
                                        sx={{
                                            '& .MuiOutlinedInput-root': {
                                                borderRadius: 2,
                                                backgroundColor: 'white',
                                                '&:hover': {
                                                    backgroundColor: 'rgba(0,0,0,0.02)'
                                                }
                                            }
                                        }}
                                    />
                                </Box>

                                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                                    <Box sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        backgroundColor: 'rgba(25, 118, 210, 0.07)',
                                        border: '1px solid #e3eafc'
                                    }}>
                                        <Typography variant="subtitle2" sx={{
                                            mb: 2,
                                            fontWeight: 'bold',
                                            color: '#1976d2',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1
                                        }}>
                                            🔧 Technical Support (TS)
                                        </Typography>
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
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            borderRadius: 2,
                                                            backgroundColor: 'white'
                                                        }
                                                    }}
                                                />
                                            )}
                                            renderOption={(props, option) => (
                                                <li {...props}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Box sx={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: '50%',
                                                            backgroundColor: '#1976d2'
                                                        }} />
                                                        <Box>
                                                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                                {option.name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {option.role}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </li>
                                            )}
                                        />
                                    </Box>

                                    <Box sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        backgroundColor: 'rgba(76, 175, 80, 0.07)',
                                        border: '1px solid #e3eafc'
                                    }}>
                                        <Typography variant="subtitle2" sx={{
                                            mb: 2,
                                            fontWeight: 'bold',
                                            color: '#4caf50',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: 1
                                        }}>
                                            💬 Customer Support (CS)
                                        </Typography>
                                        <Autocomplete
                                            multiple
                                            options={csMemberOptions}
                                            getOptionLabel={(option) => option.label}
                                            value={shift.csMembers}
                                            onChange={(event, newValue) => {
                                                handleShiftChange(index, 'csMembers', newValue);
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Chọn CS"
                                                    fullWidth
                                                    placeholder="Chọn CS cho ca trực"
                                                    sx={{
                                                        '& .MuiOutlinedInput-root': {
                                                            borderRadius: 2,
                                                            backgroundColor: 'white'
                                                        }
                                                    }}
                                                />
                                            )}
                                            renderOption={(props, option) => (
                                                <li {...props}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <Box sx={{
                                                            width: 8,
                                                            height: 8,
                                                            borderRadius: '50%',
                                                            backgroundColor: '#4caf50'
                                                        }} />
                                                        <Box>
                                                            <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                                {option.name}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {option.role}
                                                            </Typography>
                                                        </Box>
                                                    </Box>
                                                </li>
                                            )}
                                        />
                                    </Box>
                                </Box>
                            </Box>
                        ))}

                        <Box sx={{
                            display: 'flex',
                            gap: 3,
                            pt: 2,
                            borderTop: '2px solid #e3eafc'
                        }}>
                            <Button
                                variant="outlined"
                                onClick={handleAddShift}
                                startIcon={<AddIcon />}
                                sx={{
                                    minWidth: 150,
                                    height: 48,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    borderColor: '#1976d2',
                                    color: '#1976d2',
                                    background: 'white',
                                    '&:hover': {
                                        backgroundColor: 'rgba(25, 118, 210, 0.08)',
                                        borderColor: '#1565c0'
                                    }
                                }}
                            >
                                ➕ Thêm ca trực
                            </Button>

                            <Button
                                variant="contained"
                                onClick={handleSaveWorkShift}
                                disabled={isLoading}
                                sx={{
                                    minWidth: 150,
                                    height: 48,
                                    borderRadius: 2,
                                    textTransform: 'none',
                                    fontWeight: 'bold',
                                    fontSize: '1rem',
                                    background: 'linear-gradient(135deg, #1976d2 0%, #1565c0 100%)',
                                    boxShadow: '0 4px 15px rgba(25, 118, 210, 0.13)',
                                    '&:hover': {
                                        background: 'linear-gradient(135deg, #1565c0 0%, #0d47a1 100%)',
                                        boxShadow: '0 6px 20px rgba(25, 118, 210, 0.18)'
                                    },
                                    '&:disabled': {
                                        background: '#e0e0e0',
                                        boxShadow: 'none'
                                    }
                                }}
                            >
                                {isLoading ? '⏳ Đang lưu...' : '💾 Lưu ca làm việc'}
                            </Button>
                        </Box>
                    </Box>
                </Paper>

                {/* Leaderboard Input Section */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Quản lý điểm Leaderboard (TS & CS)
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {/* Month and Year Selection */}
                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <FormControl fullWidth>
                                <InputLabel>Tháng</InputLabel>
                                <Select
                                    value={leaderboardData.month}
                                    label="Tháng"
                                    onChange={(e) => setLeaderboardData(prev => ({
                                        ...prev,
                                        month: e.target.value
                                    }))}
                                >
                                    {Array.from({ length: 12 }, (_, i) => (
                                        <MenuItem key={i + 1} value={i + 1}>
                                            Tháng {i + 1}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl fullWidth>
                                <InputLabel>Năm</InputLabel>
                                <Select
                                    value={leaderboardData.year}
                                    label="Năm"
                                    onChange={(e) => setLeaderboardData(prev => ({
                                        ...prev,
                                        year: e.target.value
                                    }))}
                                >
                                    {Array.from({ length: 5 }, (_, i) => {
                                        const year = new Date().getFullYear() - 2 + i;
                                        return (
                                            <MenuItem key={year} value={year}>
                                                {year}
                                            </MenuItem>
                                        );
                                    })}
                                </Select>
                            </FormControl>
                        </Box>

                        {/* Points Input */}
                        {leaderboardData.points.map((point, index) => (
                            <Box key={index} sx={{ 
                                p: 2, 
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 1,
                                position: 'relative'
                            }}>
                                {leaderboardData.points.length > 1 && (
                                    <IconButton
                                        onClick={() => handleRemovePoints(index)}
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
                                    Điểm số {index + 1}
                                </Typography>
                                <Box sx={{ display: 'flex', gap: 2 }}>
                                    <Box sx={{ flex: 8 }}>
                                        <Autocomplete
                                            options={tsMemberOptions}
                                            getOptionLabel={(option) => option.label}
                                            value={tsMemberOptions.find(option => option.id === point.memberId) || null}
                                            onChange={(event, newValue) => {
                                                handlePointsChange(index, 'memberId', newValue?.id || '');
                                            }}
                                            renderInput={(params) => (
                                                <TextField
                                                    {...params}
                                                    label="Chọn thành viên"
                                                    placeholder="Chọn thành viên"
                                                    sx={{
                                                        '& .MuiInputBase-input': {
                                                            fontSize: '1.2rem',
                                                            fontWeight: 'bold'
                                                        }
                                                    }}
                                                />
                                            )}
                                            renderOption={(props, option) => (
                                                <li {...props}>
                                                    <Box>
                                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                                            {option.name}
                                                        </Typography>
                                                        <Typography variant="caption" color="text.secondary">
                                                            {option.role}
                                                        </Typography>
                                                    </Box>
                                                </li>
                                            )}
                                        />
                                    </Box>
                                    <Box sx={{ flex: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <TextField
                                            label="Điểm số"
                                            type="number"
                                            value={point.points}
                                            onChange={(e) => handlePointsChange(index, 'points', parseInt(e.target.value) || 0)}
                                            InputProps={{
                                                inputProps: { min: 0 },
                                                sx: {
                                                    fontSize: '0.9rem',
                                                    color: 'text.secondary'
                                                }
                                            }}
                                            sx={{
                                                '& .MuiInputLabel-root': {
                                                    fontSize: '0.9rem'
                                                }
                                            }}
                                        />
                                        <input
                                            accept="image/*"
                                            style={{ display: 'none' }}
                                            id={`avatar-upload-${index}`}
                                            type="file"
                                            onChange={e => {
                                                if (e.target.files[0]) handleAvatarChange(index, e.target.files[0]);
                                            }}
                                        />
                                        <label htmlFor={`avatar-upload-${index}`}>
                                            <IconButton color="primary" component="span">
                                                <PhotoCamera />
                                            </IconButton>
                                        </label>
                                        {point.avatarUrl && (
                                            <Avatar src={point.avatarUrl} sx={{ width: 36, height: 36, ml: 1 }} />
                                        )}
                                    </Box>
                                </Box>
                            </Box>
                        ))}

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button 
                                variant="outlined" 
                                onClick={handleAddPoints}
                                startIcon={<AddIcon />}
                                sx={{ 
                                    minWidth: 120,
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 'bold'
                                }}
                            >
                                Thêm điểm
                            </Button>

                            <Button 
                                variant="contained" 
                                onClick={handleSavePoints}
                                disabled={isLoading}
                                sx={{ 
                                    minWidth: 120,
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 'bold'
                                }}
                            >
                                Lưu điểm
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

                {/* Phần tìm kiếm cards */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Tìm kiếm Cards
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <TextField
                            label="Từ khóa tìm kiếm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            fullWidth
                            placeholder="Nhập từ khóa để tìm kiếm cards..."
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                        />
                        <Button 
                            variant="contained" 
                            onClick={handleSearchCards}
                            disabled={isLoading}
                            sx={{ 
                                minWidth: 120,
                                height: '56px',
                                borderRadius: 1,
                                textTransform: 'none',
                                fontWeight: 'bold'
                            }}
                        >
                            {isLoading ? 'Đang tìm...' : 'Tìm kiếm'}
                        </Button>
                    </Box>
                </Paper>

                {/* Thống kê theo App */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Thống kê theo App
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {listIds.map((listId, index) => (
                                <Box key={index} sx={{ 
                        display: 'flex', 
                                    gap: 2, 
                        alignItems: 'center', 
                                    position: 'relative'
                                }}>
                                    <TextField
                                        label={`List ID ${index + 1}`}
                                        value={listId}
                                        onChange={(e) => handleListChange(index, e.target.value)}
                                        fullWidth
                                        placeholder="Nhập List ID"
                                        sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                                    />
                                    {listIds.length > 1 && (
                                        <IconButton
                                            onClick={() => handleRemoveList(index)}
                                            sx={{
                                                color: 'error.main',
                                                position: 'absolute',
                                                right: -40
                                            }}
                                        >
                                            <CloseIcon />
                                        </IconButton>
                                    )}
                                </Box>
                            ))}
                            <Button 
                                variant="outlined" 
                                onClick={handleAddList}
                                startIcon={<AddIcon />}
                                sx={{ 
                                    alignSelf: 'flex-start',
                                    minWidth: 120,
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 'bold'
                                }}
                            >
                                Thêm List
                            </Button>
                        </Box>

                        <Box sx={{ display: 'flex', gap: 2 }}>
                            <Button 
                                variant="contained" 
                                onClick={handleGetAppStats}
                                disabled={isLoadingStats}
                                sx={{ 
                                    minWidth: 120,
                                    height: '56px',
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 'bold'
                                }}
                            >
                                {isLoadingStats ? 'Đang tải...' : 'Lấy thống kê'}
                            </Button>
                            {Object.keys(appStats).length > 0 && (
                                <Button 
                                    variant="outlined" 
                                    onClick={handleExportStats}
                                    sx={{ 
                                        minWidth: 120,
                                        height: '56px',
                                        borderRadius: 1,
                                        textTransform: 'none',
                                        fontWeight: 'bold'
                                    }}
                                >
                                    Xuất JSON
                                </Button>
                            )}
                        </Box>

                        {Object.keys(appStats).length > 0 && (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {Object.entries(appStats).map(([appName, stats]) => (
                                    <Paper 
                                        key={appName}
                                        elevation={2}
                                        sx={{ 
                                            p: 2,
                                            borderRadius: 2,
                                            background: 'linear-gradient(to right, #ffffff, #f5f5f5)'
                                        }}
                                    >
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="h6" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                                                {appName}
                                            </Typography>
                                            <Chip 
                                                label={`${stats.totalCards} cards`}
                                                color="primary"
                                                variant="outlined"
                                            />
                                        </Box>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            {Object.entries(stats.levels).map(([level, count]) => (
                                                count > 0 && (
                                                    <Chip
                                                        key={level}
                                                        label={`${level}: ${count}`}
                                                        color="success"
                                                        variant="outlined"
                                                        size="small"
                                                    />
                                                )
                                            ))}
                                        </Box>
                                    </Paper>
                                ))}
                            </Box>
                        )}
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

            {/* Search Results Modal */}
            <Dialog
                open={isSearchModalOpen}
                onClose={handleCloseSearchModal}
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
                                Kết quả tìm kiếm
                            </Typography>
                            {searchResults?.cards && (
                                <Chip 
                                    label={`${searchResults.cards.length} cards`}
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
                            {searchResults && (
                                <Tooltip title="Copy JSON">
                                    <IconButton 
                                        onClick={handleCopySearchResultsJSON}
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
                            <IconButton onClick={handleCloseSearchModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {searchResults?.cards && (
                        <Box sx={{ 
                            display: 'flex', 
                            flexDirection: 'column', 
                            gap: 2,
                            maxHeight: '60vh',
                            overflow: 'auto',
                            p: 1
                        }}>
                            {searchResults.cards.map((card) => (
                                <Paper 
                                    key={card.id}
                                    sx={{ 
                                        p: 2,
                                        display: 'flex',
                                        flexDirection: 'column',
                                        gap: 1,
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.primary.main, 0.05)
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                                            {card.name}
                                        </Typography>
                                        <Chip 
                                            label={card.closed ? 'Đã đóng' : 'Đang mở'} 
                                            size="small"
                                            color={card.closed ? 'error' : 'success'}
                                            sx={{ ml: 1 }}
                                        />
                                    </Box>
                                    
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {card.labels.map((label) => (
                                            <Chip
                                                key={label.id}
                                                label={label.name}
                                                size="small"
                                                sx={{ 
                                                    backgroundColor: alpha(getLabelColor(label.color), 0.2),
                                                    color: getLabelColor(label.color),
                                                    border: `1px solid ${alpha(getLabelColor(label.color), 0.3)}`
                                                }}
                                            />
                                        ))}
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 2, color: 'text.secondary', fontSize: '0.875rem' }}>
                                        <Typography variant="body2">
                                            Due: {formatDate(card.due)}
                                        </Typography>
                                        <Typography variant="body2">
                                            Last Activity: {formatDate(card.dateLastActivity)}
                                        </Typography>
                                    </Box>

                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                        <Typography variant="body2" color="text.secondary">
                                            URL:
                                        </Typography>
                                        <Link 
                                            href={card.url} 
                                            target="_blank" 
                                            rel="noopener noreferrer"
                                            sx={{ 
                                                color: 'primary.main',
                                                textDecoration: 'none',
                                                '&:hover': {
                                                    textDecoration: 'underline'
                                                }
                                            }}
                                        >
                                            {card.shortUrl}
                                        </Link>
                                    </Box>

                                    {card.desc && (
                                        <Typography 
                                            variant="body2" 
                                            color="text.secondary"
                                            sx={{
                                                display: '-webkit-box',
                                                WebkitLineClamp: 2,
                                                WebkitBoxOrient: 'vertical',
                                                overflow: 'hidden',
                                                textOverflow: 'ellipsis'
                                            }}
                                        >
                                            {card.desc}
                                        </Typography>
                                    )}
                                </Paper>
                            ))}
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseSearchModal}>Đóng</Button>
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
            <Button
                variant="contained"
                color="primary"
                onClick={handleOpenConversationDialog}
                sx={{ mt: 2, mb: 2 }}
            >
                Tạo Conversation Mới
            </Button>

            {/* Dialog tạo conversation */}
            <Dialog 
                open={conversationDialog} 
                onClose={handleCloseConversationDialog}
                maxWidth="sm"
                fullWidth
            >
                <DialogTitle>Tạo Conversation Mới</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        label="Note cho conversation"
                        type="text"
                        fullWidth
                        multiline
                        rows={4}
                        value={conversationNote}
                        onChange={(e) => setConversationNote(e.target.value)}
                        variant="outlined"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseConversationDialog}>Hủy</Button>
                    <Button 
                        onClick={handleCreateConversation}
                        variant="contained"
                        color="primary"
                    >
                        Tạo Conversation
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Form tạo conversation */}
            <Paper sx={{ p: 2, mt: 2, mb: 2 }}>
                <Typography variant="h6" gutterBottom>
                    Tạo Conversation Mới
                </Typography>
                <TextField
                    fullWidth
                    multiline
                    rows={4}
                    label="Note cho conversation"
                    value={conversationNote}
                    onChange={(e) => setConversationNote(e.target.value)}
                    variant="outlined"
                    sx={{ mb: 2 }}
                />
                <Button
                    variant="contained"
                    color="primary"
                    onClick={handleCreateConversation}
                    disabled={!conversationNote.trim()}
                >
                    Tạo Conversation
                </Button>
            </Paper>
        </Box>
    );
};

export default DevZone;
