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
    Tooltip
} from "@mui/material";
import {
    getCardsByList,
    getActionsByCard,
    getListsByBoardId,
    getMembers,
    getBoardLabels,
    createWebhook,
    getWebhooks,
    deleteWebhook,
    getAddMemberToCardActionsByDate,
    getCreateCardAction,
    getCardById
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
import { checkOverdueConfirmationCards, getOverdueConfirmationSummary } from "../utils/qaConfirmCard";
import CardDetailModal from "./CardDetailModal";
import errorAssignCard from "../api/errorAssignCardApi";
import listsIdData from "../data/listsId.json";
import rateKpiData from "../data/rateKpi.json";
import ShortUrlGenerator from "./ShortUrlGenerator";
import { saveCardsToDatabase, getCardsCreate } from "../api/cardCreateApi";
import { Table } from "antd";

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Extract createdAt from Trello card ID (first 8 hex chars = timestamp)
function getCreatedAtFromCardId(cardId) {
    try {
        const timestamp = parseInt(cardId.substring(0, 8), 16) * 1000;
        return new Date(timestamp).toISOString();
    } catch (error) {
        return null;
    }
}

const DevZone = () => {
    const [progress, setProgress] = useState(0);
    const [isLoading, setIsLoading] = useState(false);
    const [log, setLog] = useState("");
    const [lists, setLists] = useState(listsIdData);
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

    // Webhook states
    const [webhooks, setWebhooks] = useState(null);
    const [isWebhooksModalOpen, setIsWebhooksModalOpen] = useState(false);
    const [webhookFormData, setWebhookFormData] = useState({
        callbackURL: '',
        description: '',
        idModel: ''
    });


    // QA Cards states
    const [qaProgress, setQaProgress] = useState(0);
    const [isQaLoading, setIsQaLoading] = useState(false);
    const [qaLog, setQaLog] = useState("");
    const [overdueCards, setOverdueCards] = useState([]);

    // Push Cards to Database states
    const [isPushingCards, setIsPushingCards] = useState(false);
    const [pushCardLog, setPushCardLog] = useState("");
    const [pushCardResult, setPushCardResult] = useState(null);
    const [selectedPushListId, setSelectedPushListId] = useState("");

    // View Cards by Date states
    const [viewCardsStartDate, setViewCardsStartDate] = useState(new Date().toISOString().split('T')[0]);
    const [viewCardsEndDate, setViewCardsEndDate] = useState(new Date().toISOString().split('T')[0]);
    const [isLoadingViewCards, setIsLoadingViewCards] = useState(false);
    const [viewCardsData, setViewCardsData] = useState([]);
    const [isViewCardsModalOpen, setIsViewCardsModalOpen] = useState(false);
    const [isUpdatingViewCards, setIsUpdatingViewCards] = useState(false);
    const [updateViewCardsLog, setUpdateViewCardsLog] = useState("");

    // CardDetailModal states
    const [isCardDetailModalOpen, setIsCardDetailModalOpen] = useState(false);
    const [selectedCardId, setSelectedCardId] = useState(null);

    const [devProgress, setDevProgress] = useState(0);
    const [isDevLoading, setIsDevLoading] = useState(false);
    const [devLog, setDevLog] = useState("");

    // AddMemberToCard states
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const [addMemberActions, setAddMemberActions] = useState([]);
    const [isAddMemberLoading, setIsAddMemberLoading] = useState(false);
    const [selectedRole, setSelectedRole] = useState('all');
    const [selectedAddedRole, setSelectedAddedRole] = useState('all');
    const [filteredActions, setFilteredActions] = useState([]);
    const [isPushingData, setIsPushingData] = useState(false);

    // KPI Cards states
    const [filteredCards, setFilteredCards] = useState([]);
    const [isCardsLoading, setIsCardsLoading] = useState(false);
    const [selectedApp, setSelectedApp] = useState('');
    const [kpiStats, setKpiStats] = useState({});
    const [isKPIStatsModalOpen, setIsKPIStatsModalOpen] = useState(false);


    // Lists are now loaded from static JSON data

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
            // Use API call with BOARD_ID parameter
            const ListsData = await getListsByBoardId();
            // Filter to only include name and id fields
            const filteredListsData = ListsData.map(list => ({
                id: list.id,
                name: list.name
            }));
            setListsData(filteredListsData);
            setIsListsModalOpen(true);
        } catch (error) {
            console.error('Error loading lists:', error);
            setSnackbar({
                open: true,
                message: "Không thể tải danh sách lists. Vui lòng thử lại.",
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

    // Add these new functions after other function declarations

    const handleCloseStatsModal = () => {
      setIsStatsModalOpen(false);
    };

    const handleCopyStatsJSON = () => {
      // Function removed - no longer needed
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

    // Webhook functions
    const handleGetWebhooks = async () => {
        try {
            setIsLoading(true);
            const webhooksData = await getWebhooks();
            setWebhooks(webhooksData);
            setIsWebhooksModalOpen(true);
        } catch (error) {
            console.error('Error fetching webhooks:', error);
            setSnackbar({
                open: true,
                message: "Không thể lấy danh sách webhooks. Vui lòng thử lại.",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCreateWebhook = async () => {
        if (!webhookFormData.callbackURL.trim() || !webhookFormData.description.trim() || !webhookFormData.idModel.trim()) {
            setSnackbar({
                open: true,
                message: "Vui lòng nhập đầy đủ thông tin webhook",
                severity: "warning"
            });
            return;
        }

        try {
            setIsLoading(true);
            const newWebhook = await createWebhook(
                webhookFormData.callbackURL,
                webhookFormData.description,
                webhookFormData.idModel
            );
            
            setSnackbar({
                open: true,
                message: "Tạo webhook thành công!",
                severity: "success"
            });
            
            // Reset form
            setWebhookFormData({
                callbackURL: '',
                description: '',
                idModel: ''
            });
        } catch (error) {
            console.error('Create webhook error:', error);
            setSnackbar({
                open: true,
                message: error.message || "Có lỗi xảy ra khi tạo webhook",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleDeleteWebhook = async (webhookId) => {
        if (!webhookId) {
            setSnackbar({
                open: true,
                message: "Vui lòng nhập Webhook ID",
                severity: "warning"
            });
            return;
        }

        try {
            setIsLoading(true);
            await deleteWebhook(webhookId);
            
            setSnackbar({
                open: true,
                message: "Xóa webhook thành công!",
                severity: "success"
            });
        } catch (error) {
            console.error('Delete webhook error:', error);
            setSnackbar({
                open: true,
                message: error.message || "Có lỗi xảy ra khi xóa webhook",
                severity: "error"
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCloseWebhooksModal = () => {
        setIsWebhooksModalOpen(false);
        setWebhooks(null);
    };

    // QA Cards processing function
    const handleProcessQaCards = async () => {
        const WAITING_CONFIRMATION_LIST_ID = "63f489b961f3a274163459a2"; // "Waiting for Customer's Confirmation (SLA: 2 days)"
        
        setIsQaLoading(true);
        setQaProgress(0);
        setQaLog("Đang lấy cards từ cột Waiting for Customer's Confirmation...");

        try {
            // Get all cards from the waiting confirmation column
            const cards = await getCardsByList(WAITING_CONFIRMATION_LIST_ID);
            const total = cards.length;
            
            if (total === 0) {
                setQaLog("Không có card nào trong cột Waiting for Customer's Confirmation");
                setIsQaLoading(false);
                return;
            }

            setQaLog(`Tìm thấy ${total} cards. Đang lấy actions cho từng card...`);

            const batchSize = 5; // Smaller batch size for actions
            let allActions = [];

            // Process cards in batches to get their actions
            for (let i = 0; i < total; i += batchSize) {
                const batch = cards.slice(i, i + batchSize);
                
                await Promise.all(batch.map(async (card) => {
                    try {
                        const actions = await getActionsByCard(card.id);
                        // Add cardId to each action for tracking
                        const actionsWithCardId = actions.map(action => ({
                            ...action,
                            cardId: card.id
                        }));
                        allActions.push(...actionsWithCardId);
                    } catch (err) {
                        console.error(`❌ Lỗi lấy actions cho card ${card.id}:`, err);
                    }
                }));

                const progress = Math.round(((i + batchSize) / total) * 50); // First 50% for getting actions
                setQaProgress(progress);
                setQaLog(`Đã lấy actions cho ${Math.min(i + batchSize, total)} / ${total} cards`);
                await sleep(1000);
            }

            setQaLog("Đang kiểm tra cards quá hạn...");

            // Check for overdue cards using the utility function
            const overdueCardsResult = checkOverdueConfirmationCards(allActions);
            const summary = getOverdueConfirmationSummary(allActions);

            setOverdueCards(overdueCardsResult);
            setQaProgress(100);
            setQaLog(`✅ Hoàn thành! ${summary.summary}`);

            // Results will be shown in the box below the button

        } catch (error) {
            console.error('Error processing QA cards:', error);
            setQaLog(`❌ Lỗi: ${error.message}`);
            setSnackbar({
                open: true,
                message: "Có lỗi xảy ra khi xử lý QA cards",
                severity: "error"
            });
        } finally {
            setIsQaLoading(false);
        }
    };


    const handleCopyWebhooksJSON = () => {
        if (webhooks) {
            navigator.clipboard.writeText(JSON.stringify(webhooks, null, 2))
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

    // CardDetailModal handlers
    const handleOpenCardDetail = (cardId) => {
        setSelectedCardId(cardId);
        setIsCardDetailModalOpen(true);
    };

    const handleCloseCardDetail = () => {
        setIsCardDetailModalOpen(false);
        setSelectedCardId(null);
    };

    // AddMemberToCard functions
    const handleGetAddMemberActions = async () => {
        if (!selectedDate) {
            setSnackbar({
                open: true,
                message: "Vui lòng chọn ngày",
                severity: "warning"
            });
            return;
        }

        try {
            setIsAddMemberLoading(true);
            
            // Create date range from 00:00 to 23:59 of selected date
            const since = new Date(selectedDate + 'T00:00:00.000Z').toISOString();
            const before = new Date(selectedDate + 'T23:59:59.999Z').toISOString();
            
            console.log('Fetching addMemberToCard actions from:', since, 'to:', before);
            
            const actions = await getAddMemberToCardActionsByDate(since, before);
            setAddMemberActions(actions);
            setFilteredActions(actions); // Initialize filtered actions with all actions
            setSelectedRole('all'); // Reset filters
            setSelectedAddedRole('all');
            
            setSnackbar({
                open: true,
                message: `Đã lấy ${actions.length} addMemberToCard actions`,
                severity: "success"
            });
        } catch (error) {
            console.error('Error fetching addMemberToCard actions:', error);
            setSnackbar({
                open: true,
                message: "Không thể lấy addMemberToCard actions. Vui lòng thử lại.",
                severity: "error"
            });
        } finally {
            setIsAddMemberLoading(false);
        }
    };


    const handleCopyAddMemberJSON = () => {
        if (filteredActions.length > 0) {
            navigator.clipboard.writeText(JSON.stringify(filteredActions, null, 2))
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

    // Filter actions by role
    const handleRoleFilter = (role) => {
        setSelectedRole(role);
        applyFilters(role, selectedAddedRole);
    };

    // Filter actions by added member role
    const handleAddedRoleFilter = (addedRole) => {
        setSelectedAddedRole(addedRole);
        applyFilters(selectedRole, addedRole);
    };

    // Apply both filters
    const applyFilters = (creatorRole, addedRole) => {
        let filtered = addMemberActions;

        // Filter by creator role
        if (creatorRole !== 'all') {
            filtered = filtered.filter(action => {
                const memberCreatorId = action.memberCreator?.id;
                const member = members.find(m => m.id === memberCreatorId);
                return member && member.role === creatorRole;
            });
        }

        // Filter by added member role
        if (addedRole !== 'all') {
            filtered = filtered.filter(action => {
                const memberAddedId = action.data?.member?.id;
                const member = members.find(m => m.id === memberAddedId);
                return member && member.role === addedRole;
            });
        }

        setFilteredActions(filtered);
    };

    // Get unique roles from members
    const getUniqueRoles = () => {
        const roles = [...new Set(members.map(member => member.role).filter(role => role))];
        return roles.sort();
    };

    // Push filtered data to database
    const handlePushDataToDatabase = async () => {
        if (filteredActions.length === 0) {
            setSnackbar({
                open: true,
                message: "Không có dữ liệu để push lên database",
                severity: "warning"
            });
            return;
        }

        try {
            setIsPushingData(true);
            
            // Transform filtered actions to the format expected by errorAssignCard
            const dataToPush = filteredActions.map(action => ({
                idMemberCreator: action.memberCreator?.id,
                idMemberAssigned: action.data?.member?.id,
                date: action.date,
                card: action.data?.card
            }));

            console.log('Pushing data to database:', dataToPush);
            
            // Call the errorAssignCard API
            const response = await errorAssignCard.createErrorAssignCards(dataToPush);
            
            setSnackbar({
                open: true,
                message: `Đã push thành công ${dataToPush.length} records lên database`,
                severity: "success"
            });
            
        } catch (error) {
            console.error('Error pushing data to database:', error);
            setSnackbar({
                open: true,
                message: `Lỗi khi push dữ liệu: ${error.message || 'Unknown error'}`,
                severity: "error"
            });
        } finally {
            setIsPushingData(false);
        }
    };

    // KPI Cards functions
    const handleGetCardsForKPI = async () => {
        if (!selectedListId) {
            setSnackbar({
                open: true,
                message: "Vui lòng chọn một list!",
                severity: "warning"
            });
            return;
        }

        try {
            setIsCardsLoading(true);
            const cards = await getCardsByList(selectedListId);
            setFilteredCards(cards);
            
            // Calculate KPI statistics
            calculateKPIStatistics(cards);
            
            setSnackbar({
                open: true,
                message: `Đã lấy ${cards.length} cards từ list`,
                severity: "success"
            });
        } catch (error) {
            console.error('Error fetching cards:', error);
            setSnackbar({
                open: true,
                message: "Không thể lấy cards từ list",
                severity: "error"
            });
        } finally {
            setIsCardsLoading(false);
        }
    };

    const calculateKPIStatistics = (cards) => {
        const stats = {};
        
        cards.forEach(card => {
            // Extract app name from card name (assuming format like "AppName: Issue description")
            const appName = card.name.split(':')[0].trim();
            if (!stats[appName]) {
                stats[appName] = {
                    totalCards: 0,
                    totalPoints: 0,
                    levelBreakdown: {}
                };
            }
            
            stats[appName].totalCards++;
            
            // Calculate points based on labels and rateKpi
            const cardPoints = calculateCardPoints(card);
            stats[appName].totalPoints += cardPoints;
            
            // Track level breakdown
            const level = getCardLevel(card);
            if (!stats[appName].levelBreakdown[level]) {
                stats[appName].levelBreakdown[level] = {
                    count: 0,
                    points: 0
                };
            }
            stats[appName].levelBreakdown[level].count++;
            stats[appName].levelBreakdown[level].points += cardPoints;
        });
        
        setKpiStats(stats);
    };

    const calculateCardPoints = (card) => {
        const level = getCardLevel(card);
        const issueRate = rateKpiData.issueRate;
        
        // Find matching rate for the level
        for (const [key, rate] of Object.entries(issueRate)) {
            if (key.toLowerCase().includes(level.toLowerCase())) {
                return rate;
            }
        }
        
        // Default rate if no match found
        return 0;
    };

    const getCardLevel = (card) => {
        // Check labels for level information
        if (card.labels && card.labels.length > 0) {
            for (const label of card.labels) {
                const labelName = label.name.toLowerCase();
                if (labelName.includes('level 0')) return 'level 0';
                if (labelName.includes('level 1')) return 'level 1';
                if (labelName.includes('level 2')) return 'level 2';
                if (labelName.includes('level 3')) return 'level 3';
                if (labelName.includes('level 4')) return 'level 4';
            }
        }
        
        // Check card name for level information
        const cardName = card.name.toLowerCase();
        if (cardName.includes('level 0')) return 'level 0';
        if (cardName.includes('level 1')) return 'level 1';
        if (cardName.includes('level 2')) return 'level 2';
        if (cardName.includes('level 3')) return 'level 3';
        if (cardName.includes('level 4')) return 'level 4';
        
        return 'unknown';
    };

    const handleFilterByApp = (appName) => {
        setSelectedApp(appName);
        if (appName === '') {
            setFilteredCards([]);
        } else {
            const filtered = filteredCards.filter(card => 
                card.name.split(':')[0].trim() === appName
            );
            setFilteredCards(filtered);
        }
    };

    const handleOpenKPIStatsModal = () => {
        setIsKPIStatsModalOpen(true);
    };

    const handleCloseKPIStatsModal = () => {
        setIsKPIStatsModalOpen(false);
    };

    // Process cards in batches - reusable function
    const processCardsInBatches = async (trelloCards, onLog) => {
        const BATCH_SIZE = 10;
        const totalBatches = Math.ceil(trelloCards.length / BATCH_SIZE);
        let totalCreated = 0;
        let totalUpdated = 0;
        let totalErrors = 0;

        for (let i = 0; i < trelloCards.length; i += BATCH_SIZE) {
            const batch = trelloCards.slice(i, i + BATCH_SIZE);
            const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

            onLog(`Batch ${batchNumber}/${totalBatches}: Đang lấy createdAt cho ${batch.length} cards...`);

            // Process each card in the batch concurrently to get createdAt
            const batchCards = await Promise.all(
                batch.map(async (card) => {
                    // Try to get createdAt from Trello API first, fallback to extracting from card ID
                    const createdAt = await getCreateCardAction(card.id) || getCreatedAtFromCardId(card.id);

                    // Skip card if no createdAt
                    if (!createdAt) {
                        return null;
                    }

                    return {
                        cardId: card.id,
                        cardName: card.name,
                        cardUrl: card.shortUrl || card.url,
                        dueComplete: card.dueComplete || false,
                        labels: card.labels ? card.labels.map(l => l.name) : [],
                        members: card.idMembers || [],
                        createdAt: createdAt
                    };
                })
            );

            // Filter out null values (cards without createdAt)
            const validBatchCards = batchCards.filter(c => c !== null);
            const skippedCount = batchCards.length - validBatchCards.length;

            if (validBatchCards.length === 0) {
                onLog(`Batch ${batchNumber}/${totalBatches}: Bỏ qua - không có card nào có createdAt`);
                continue;
            }

            // Push batch to database immediately
            onLog(`Batch ${batchNumber}/${totalBatches}: Đang push ${validBatchCards.length} cards lên database...${skippedCount > 0 ? ` (Bỏ qua ${skippedCount} cards không có createdAt)` : ''}`);
            const result = await saveCardsToDatabase(validBatchCards);

            totalCreated += result.results.created;
            totalUpdated += result.results.updated;
            totalErrors += result.results.errors;

            onLog(`Batch ${batchNumber}/${totalBatches}: Hoàn thành (Created: ${result.results.created}, Updated: ${result.results.updated})`);
        }

        return {
            total: trelloCards.length,
            created: totalCreated,
            updated: totalUpdated,
            errors: totalErrors
        };
    };

    // Handle push cards to database
    const handlePushCardsToDatabase = async () => {
        if (!selectedPushListId) {
            setPushCardLog("Vui lòng chọn list trước!");
            return;
        }

        setIsPushingCards(true);
        setPushCardLog("Đang lấy cards từ Trello...");
        setPushCardResult(null);

        try {
            // Step 1: Get cards from Trello (frontend)
            const trelloCards = await getCardsByList(selectedPushListId);

            if (!trelloCards || trelloCards.length === 0) {
                setPushCardLog("❌ Không tìm thấy card nào trong list này!");
                setIsPushingCards(false);
                return;
            }

            setPushCardLog(`Đã lấy ${trelloCards.length} cards từ Trello. Đang xử lý và push từng batch...`);

            // Step 2: Process cards in batches
            const result = await processCardsInBatches(trelloCards, setPushCardLog);

            setPushCardResult(result);
            setPushCardLog(`✅ Hoàn thành! Đã xử lý ${result.total} cards (Created: ${result.created}, Updated: ${result.updated}, Errors: ${result.errors})`);
        } catch (error) {
            setPushCardLog(`❌ Lỗi: ${error.message}`);
            setPushCardResult(null);
        } finally {
            setIsPushingCards(false);
        }
    };

    // Handle view cards by date range
    const handleViewCardsByDate = async () => {
        if (!viewCardsStartDate || !viewCardsEndDate) return;

        setIsLoadingViewCards(true);
        try {
            const result = await getCardsCreate(viewCardsStartDate, viewCardsEndDate);
            setViewCardsData(result.data || []);
            setIsViewCardsModalOpen(true);
        } catch (error) {
            console.error('Error getting cards by date:', error);
            setViewCardsData([]);
        } finally {
            setIsLoadingViewCards(false);
        }
    };

    // Handle update cards from search results
    const handleUpdateViewCards = async () => {
        if (!viewCardsData || viewCardsData.length === 0) {
            setUpdateViewCardsLog("❌ Không có cards để update!");
            return;
        }

        setIsUpdatingViewCards(true);
        setUpdateViewCardsLog("Đang lấy data mới từ Trello...");

        try {
            const BATCH_SIZE = 10;
            const totalBatches = Math.ceil(viewCardsData.length / BATCH_SIZE);
            let totalCreated = 0;
            let totalUpdated = 0;
            let totalErrors = 0;

            for (let i = 0; i < viewCardsData.length; i += BATCH_SIZE) {
                const batch = viewCardsData.slice(i, i + BATCH_SIZE);
                const batchNumber = Math.floor(i / BATCH_SIZE) + 1;

                setUpdateViewCardsLog(`Batch ${batchNumber}/${totalBatches}: Đang lấy data mới cho ${batch.length} cards...`);

                // Get fresh data from Trello for each card in batch
                const batchCards = await Promise.all(
                    batch.map(async (card) => {
                        try {
                            const freshCard = await getCardById(card.cardId);
                            if (freshCard) {
                                return {
                                    cardId: freshCard.id,
                                    cardName: freshCard.name,
                                    cardUrl: freshCard.shortUrl || freshCard.url,
                                    dueComplete: freshCard.dueComplete || false,
                                    labels: freshCard.labels ? freshCard.labels.map(l => l.name) : [],
                                    members: freshCard.idMembers || [],
                                    createdAt: card.createdAt // Keep original createdAt
                                };
                            }
                            return null;
                        } catch (err) {
                            console.error(`Error fetching card ${card.cardId}:`, err);
                            return null;
                        }
                    })
                );

                // Filter out null values (failed fetches)
                const validCards = batchCards.filter(c => c !== null);

                if (validCards.length > 0) {
                    setUpdateViewCardsLog(`Batch ${batchNumber}/${totalBatches}: Đang update ${validCards.length} cards lên database...`);
                    const result = await saveCardsToDatabase(validCards);

                    totalCreated += result.results.created;
                    totalUpdated += result.results.updated;
                    totalErrors += result.results.errors;
                }

                setUpdateViewCardsLog(`Batch ${batchNumber}/${totalBatches}: Hoàn thành`);
            }

            setUpdateViewCardsLog(`✅ Hoàn thành! Updated: ${totalUpdated}, Created: ${totalCreated}, Errors: ${totalErrors}`);

            // Refresh the data
            const refreshResult = await getCardsCreate(viewCardsStartDate, viewCardsEndDate);
            setViewCardsData(refreshResult.data || []);
        } catch (error) {
            setUpdateViewCardsLog(`❌ Lỗi: ${error.message}`);
        } finally {
            setIsUpdatingViewCards(false);
        }
    };

    // Columns for view cards table
    const viewCardsColumns = [
        {
            title: 'STT',
            key: 'index',
            width: 60,
            render: (_, __, index) => index + 1
        },
        {
            title: 'Card Name',
            dataIndex: 'cardName',
            key: 'cardName',
            render: (text, record) => (
                <a href={record.cardUrl} target="_blank" rel="noopener noreferrer">
                    {text}
                </a>
            )
        },
        {
            title: 'Labels',
            dataIndex: 'labels',
            key: 'labels',
            render: (labels) => labels?.join(', ') || '-'
        },
        {
            title: 'Members',
            dataIndex: 'members',
            key: 'members',
            render: (members) => members?.length || 0
        },
        {
            title: 'Due Complete',
            dataIndex: 'dueComplete',
            key: 'dueComplete',
            width: 100,
            render: (value) => value ? '✅' : '❌'
        },
        {
            title: 'Created At',
            dataIndex: 'createdAt',
            key: 'createdAt',
            width: 180,
            render: (date) => date ? new Date(date).toLocaleString('vi-VN') : '-'
        }
    ];

    return (
        <Box sx={{ maxWidth: 1200, margin: '0 auto', p: 3 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                {/* Short URL Generator */}
                <ShortUrlGenerator />
                
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

                {/* Push Cards to Database */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3, mt: 4, border: '2px solid #4caf50' }}>
                    <Typography variant="h6" sx={{ mb: 3, color: '#4caf50', fontWeight: 'bold' }}>
                        📤 Push Cards to Database (cardsCreate)
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                        <FormControl fullWidth>
                            <InputLabel id="push-list-select-label">Chọn List để Push</InputLabel>
                            <Select
                                labelId="push-list-select-label"
                                value={selectedPushListId}
                                label="Chọn List để Push"
                                onChange={e => setSelectedPushListId(e.target.value)}
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
                            onClick={handlePushCardsToDatabase}
                            disabled={isPushingCards || !selectedPushListId}
                            sx={{
                                minWidth: 200,
                                backgroundColor: '#4caf50',
                                '&:hover': { backgroundColor: '#388e3c' }
                            }}
                        >
                            {isPushingCards ? 'Đang Push...' : 'Push Cards to DB'}
                        </Button>
                    </Box>
                    {pushCardLog && (
                        <Box sx={{
                            mt: 2,
                            p: 2,
                            backgroundColor: pushCardLog.includes('❌') ? '#ffebee' : '#e8f5e9',
                            borderRadius: 1
                        }}>
                            <Typography sx={{
                                color: pushCardLog.includes('❌') ? '#c62828' : '#2e7d32',
                                fontWeight: 500
                            }}>
                                {pushCardLog}
                            </Typography>
                        </Box>
                    )}
                    {pushCardResult && (
                        <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
                            <Chip label={`Total: ${pushCardResult.total}`} color="primary" />
                            <Chip label={`Created: ${pushCardResult.created}`} color="success" />
                            <Chip label={`Updated: ${pushCardResult.updated}`} color="info" />
                            {pushCardResult.errors > 0 && (
                                <Chip label={`Errors: ${pushCardResult.errors}`} color="error" />
                            )}
                        </Box>
                    )}

                    {/* View Cards by Date */}
                    <Box sx={{ mt: 3, pt: 3, borderTop: '1px solid #e0e0e0' }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 'bold', color: '#1976d2' }}>
                            📋 Xem Cards theo ngày
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                type="date"
                                label="Từ ngày"
                                value={viewCardsStartDate}
                                onChange={(e) => setViewCardsStartDate(e.target.value)}
                                size="small"
                                sx={{ width: 170 }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <TextField
                                type="date"
                                label="Đến ngày"
                                value={viewCardsEndDate}
                                onChange={(e) => setViewCardsEndDate(e.target.value)}
                                size="small"
                                sx={{ width: 170 }}
                                InputLabelProps={{ shrink: true }}
                            />
                            <Button
                                variant="outlined"
                                onClick={handleViewCardsByDate}
                                disabled={isLoadingViewCards}
                                sx={{ minWidth: 150 }}
                            >
                                {isLoadingViewCards ? 'Đang tải...' : 'Xem Cards'}
                            </Button>
                            {viewCardsData.length > 0 && !isViewCardsModalOpen && (
                                <Chip
                                    label={`${viewCardsData.length} cards`}
                                    color="primary"
                                    size="small"
                                    onClick={() => setIsViewCardsModalOpen(true)}
                                    sx={{ cursor: 'pointer' }}
                                />
                            )}
                        </Box>
                    </Box>
                </Paper>

                {/* Modal View Cards by Date */}
                <Dialog
                    open={isViewCardsModalOpen}
                    onClose={() => setIsViewCardsModalOpen(false)}
                    maxWidth="lg"
                    fullWidth
                >
                    <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                            📋 Cards từ {viewCardsStartDate} đến {viewCardsEndDate}
                            <Chip label={`${viewCardsData.length} cards`} size="small" color="primary" sx={{ ml: 2 }} />
                        </Box>
                        <IconButton onClick={() => setIsViewCardsModalOpen(false)}>
                            <CloseIcon />
                        </IconButton>
                    </DialogTitle>
                    <DialogContent>
                        {updateViewCardsLog && (
                            <Box sx={{
                                mb: 2,
                                p: 2,
                                backgroundColor: updateViewCardsLog.includes('❌') ? '#ffebee' : updateViewCardsLog.includes('✅') ? '#e8f5e9' : '#e3f2fd',
                                borderRadius: 1
                            }}>
                                <Typography sx={{
                                    color: updateViewCardsLog.includes('❌') ? '#c62828' : updateViewCardsLog.includes('✅') ? '#2e7d32' : '#1565c0',
                                    fontWeight: 500
                                }}>
                                    {updateViewCardsLog}
                                </Typography>
                            </Box>
                        )}
                        <Table
                            columns={viewCardsColumns}
                            dataSource={viewCardsData}
                            rowKey="cardId"
                            size="small"
                            pagination={{ pageSize: 20 }}
                            scroll={{ y: 500 }}
                        />
                    </DialogContent>
                    <DialogActions>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleUpdateViewCards}
                            disabled={isUpdatingViewCards || viewCardsData.length === 0}
                        >
                            {isUpdatingViewCards ? 'Đang update...' : `Update ${viewCardsData.length} cards`}
                        </Button>
                        <Button onClick={() => setIsViewCardsModalOpen(false)}>Đóng</Button>
                    </DialogActions>
                </Dialog>

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

                {/* Section mới - Xem tất cả Lists từ JSON */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3, background: 'linear-gradient(135deg, #f0f8ff 0%, #e0f2fe 100%)' }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        🆕 Xem tất cả Lists từ JSON Data
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                        Hiển thị tất cả {lists.length} lists có sẵn từ file listsId.json
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                        <Button 
                            variant="contained" 
                            onClick={handleGetLists}
                            disabled={isLoading}
                            sx={{ 
                                minWidth: 200,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #1d4ed8 0%, #3b82f6 100%)'
                                }
                            }}
                        >
                            📋 Xem tất cả Lists
                        </Button>
                        <Button 
                            variant="outlined" 
                            onClick={() => {
                                const listNames = lists.map(list => `${list.name} (${list.id})`).join('\n');
                                navigator.clipboard.writeText(listNames);
                                setSnackbar({
                                    open: true,
                                    message: "Đã sao chép danh sách lists vào clipboard",
                                    severity: "success"
                                });
                            }}
                            sx={{ 
                                minWidth: 200,
                                borderRadius: 2,
                                borderColor: '#3b82f6',
                                color: '#3b82f6',
                                '&:hover': {
                                    borderColor: '#1d4ed8',
                                    backgroundColor: 'rgba(59, 130, 246, 0.05)'
                                }
                            }}
                        >
                            📄 Copy danh sách Lists
                        </Button>
                    </Box>
                    <Box sx={{ 
                        mt: 2, 
                        p: 2, 
                        backgroundColor: 'rgba(59, 130, 246, 0.05)', 
                        borderRadius: 2,
                        border: '1px solid rgba(59, 130, 246, 0.1)'
                    }}>
                        <Typography variant="body2" color="primary.main" sx={{ fontWeight: 500, mb: 1 }}>
                            📊 Thống kê Lists từ JSON:
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            • Tổng số lists: <strong>{lists.length}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            • Lists có SLA: <strong>{lists.filter(list => list.name.includes('SLA')).length}</strong>
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            • Lists Done: <strong>{lists.filter(list => list.name.toLowerCase().includes('done')).length}</strong>
                        </Typography>
                    </Box>
                </Paper>

                {/* Section mới - Lấy Cards theo List và Filter theo App để tính KPI */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3, background: 'linear-gradient(135deg, #f0fff4 0%, #e6fffa 100%)' }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        🆕 Lấy Cards theo List & Filter theo App để tính KPI
                    </Typography>
                    <Typography variant="body2" sx={{ mb: 3, color: 'text.secondary' }}>
                        Lấy cards từ list, filter theo app và tính tổng points theo level dựa vào rateKpi.json
                    </Typography>
                    
                    {/* Chọn List và lấy Cards */}
                    <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
                        <FormControl sx={{ minWidth: 300 }}>
                            <InputLabel id="kpi-list-select-label">Chọn List để lấy Cards</InputLabel>
                            <Select
                                labelId="kpi-list-select-label"
                                value={selectedListId}
                                label="Chọn List để lấy Cards"
                                onChange={(e) => setSelectedListId(e.target.value)}
                                sx={{ 
                                    '& .MuiOutlinedInput-root': { 
                                        borderRadius: 2,
                                        backgroundColor: 'white'
                                    } 
                                }}
                            >
                                {lists.map((list) => (
                                    <MenuItem key={list.id} value={list.id}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                            <Typography variant="body1" sx={{ fontWeight: 500 }}>
                                                {list.name}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                                ID: {list.id}
                                            </Typography>
                                        </Box>
                                    </MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                        <Button 
                            variant="contained" 
                            onClick={handleGetCardsForKPI}
                            disabled={isCardsLoading || !selectedListId}
                            sx={{ 
                                minWidth: 200,
                                borderRadius: 2,
                                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                                '&:hover': {
                                    background: 'linear-gradient(135deg, #059669 0%, #10b981 100%)'
                                }
                            }}
                        >
                            {isCardsLoading ? 'Đang lấy...' : '📊 Lấy Cards & Tính KPI'}
                        </Button>
                    </Box>

                    {/* Filter theo App */}
                    {Object.keys(kpiStats).length > 0 && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                                🔍 Filter theo App:
                            </Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                                <Button
                                    variant={selectedApp === '' ? 'contained' : 'outlined'}
                                    onClick={() => handleFilterByApp('')}
                                    size="small"
                                    sx={{ borderRadius: 2 }}
                                >
                                    Tất cả Apps
                                </Button>
                                {Object.keys(kpiStats).map(appName => (
                                    <Button
                                        key={appName}
                                        variant={selectedApp === appName ? 'contained' : 'outlined'}
                                        onClick={() => handleFilterByApp(appName)}
                                        size="small"
                                        sx={{ borderRadius: 2 }}
                                    >
                                        {appName} ({kpiStats[appName].totalCards})
                                    </Button>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Hiển thị thống kê KPI */}
                    {Object.keys(kpiStats).length > 0 && (
                        <Box sx={{ 
                            p: 2, 
                            backgroundColor: 'rgba(16, 185, 129, 0.05)', 
                            borderRadius: 2,
                            border: '1px solid rgba(16, 185, 129, 0.1)',
                            mb: 2
                        }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6" color="success.main" sx={{ fontWeight: 600 }}>
                                    📈 Thống kê KPI theo App
                                </Typography>
                                <Button
                                    variant="outlined"
                                    onClick={handleOpenKPIStatsModal}
                                    size="small"
                                    sx={{ borderRadius: 2 }}
                                >
                                    📊 Xem chi tiết
                                </Button>
                            </Box>
                            
                            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 2 }}>
                                {Object.entries(kpiStats).map(([appName, stats]) => (
                                    <Box key={appName} sx={{ 
                                        p: 2, 
                                        backgroundColor: 'white', 
                                        borderRadius: 2,
                                        border: '1px solid rgba(16, 185, 129, 0.2)'
                                    }}>
                                        <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
                                            {appName}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Cards: <strong>{stats.totalCards}</strong>
                                        </Typography>
                                        <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                                            KPI Points: <strong>{stats.totalPoints}</strong>
                                        </Typography>
                                        <Box sx={{ mt: 1 }}>
                                            {Object.entries(stats.levelBreakdown).map(([level, levelStats]) => (
                                                <Typography key={level} variant="caption" display="block">
                                                    {level}: {levelStats.count} cards ({levelStats.points} pts)
                                                </Typography>
                                            ))}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}

                    {/* Hiển thị cards đã filter */}
                    {filteredCards.length > 0 && (
                        <Box sx={{ 
                            p: 2, 
                            backgroundColor: 'rgba(16, 185, 129, 0.05)', 
                            borderRadius: 2,
                            border: '1px solid rgba(16, 185, 129, 0.1)'
                        }}>
                            <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                                📋 Cards đã filter ({filteredCards.length} cards):
                            </Typography>
                            <Box sx={{ maxHeight: 300, overflowY: 'auto' }}>
                                {filteredCards.map((card, index) => (
                                    <Box key={card.id} sx={{ 
                                        p: 2, 
                                        mb: 1, 
                                        backgroundColor: 'white', 
                                        borderRadius: 2,
                                        border: '1px solid rgba(0,0,0,0.1)'
                                    }}>
                                        <Typography variant="body2" sx={{ fontWeight: 500, mb: 1 }}>
                                            {index + 1}. {card.name}
                                        </Typography>
                                        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                            <Chip 
                                                label={`Level: ${getCardLevel(card)}`} 
                                                size="small" 
                                                color="primary"
                                            />
                                            <Chip 
                                                label={`Points: ${calculateCardPoints(card)}`} 
                                                size="small" 
                                                color="success"
                                            />
                                            {card.labels && card.labels.map(label => (
                                                <Chip 
                                                    key={label.id} 
                                                    label={label.name} 
                                                    size="small" 
                                                    variant="outlined"
                                                />
                                            ))}
                                        </Box>
                                    </Box>
                                ))}
                            </Box>
                        </Box>
                    )}
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

                {/* Phần lấy AddMemberToCard Actions */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Lấy AddMemberToCard Actions
                    </Typography>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2 }}>
                        <TextField
                            label="Chọn ngày"
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            InputLabelProps={{
                                shrink: true,
                            }}
                            sx={{ 
                                minWidth: 200,
                                '& .MuiOutlinedInput-root': { borderRadius: 1 } 
                            }}
                        />
                        <Button 
                            variant="contained" 
                            onClick={handleGetAddMemberActions}
                            disabled={isAddMemberLoading}
                            sx={{ 
                                minWidth: 200,
                                borderRadius: 1
                            }}
                        >
                            Lấy AddMemberToCard Actions
                        </Button>
                    </Box>
                    
                    {/* Role Filters */}
                    {addMemberActions.length > 0 && (
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
                            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 80 }}>
                                Lọc theo role:
                            </Typography>
                            <FormControl sx={{ minWidth: 150 }}>
                                <InputLabel id="creator-role-filter-label">Creator Role</InputLabel>
                                <Select
                                    labelId="creator-role-filter-label"
                                    value={selectedRole}
                                    label="Creator Role"
                                    onChange={(e) => handleRoleFilter(e.target.value)}
                                    size="small"
                                >
                                    <MenuItem value="all">Tất cả</MenuItem>
                                    {getUniqueRoles().map((role) => (
                                        <MenuItem key={role} value={role}>
                                            {role.toUpperCase()}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <FormControl sx={{ minWidth: 150 }}>
                                <InputLabel id="added-role-filter-label">Added Role</InputLabel>
                                <Select
                                    labelId="added-role-filter-label"
                                    value={selectedAddedRole}
                                    label="Added Role"
                                    onChange={(e) => handleAddedRoleFilter(e.target.value)}
                                    size="small"
                                >
                                    <MenuItem value="all">Tất cả</MenuItem>
                                    {getUniqueRoles().map((role) => (
                                        <MenuItem key={role} value={role}>
                                            {role.toUpperCase()}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                        </Box>
                    )}
                    {addMemberActions.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                                <Typography variant="body2" color="text.secondary">
                                    Số lượng actions:
                                </Typography>
                                <Chip 
                                    label={`${filteredActions.length} / ${addMemberActions.length}`} 
                                    size="small"
                                    sx={{ 
                                        backgroundColor: alpha(theme.palette.primary.main, 0.1),
                                        color: 'primary.main',
                                        fontWeight: 500
                                    }}
                                />
                                {(selectedRole !== 'all' || selectedAddedRole !== 'all') && (
                                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                        {selectedRole !== 'all' && (
                                            <Chip 
                                                label={`Creator: ${selectedRole.toUpperCase()}`} 
                                                size="small"
                                                color="primary"
                                                variant="outlined"
                                            />
                                        )}
                                        {selectedAddedRole !== 'all' && (
                                            <Chip 
                                                label={`Added: ${selectedAddedRole.toUpperCase()}`} 
                                                size="small"
                                                color="secondary"
                                                variant="outlined"
                                            />
                                        )}
                                    </Box>
                                )}
                                <Tooltip title="Copy JSON">
                                    <IconButton 
                                        onClick={handleCopyAddMemberJSON}
                                        size="small"
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
                                <Button
                                    variant="contained"
                                    color="success"
                                    size="small"
                                    onClick={handlePushDataToDatabase}
                                    disabled={isPushingData || filteredActions.length === 0}
                                    sx={{ 
                                        ml: 1,
                                        fontWeight: 600,
                                        borderRadius: 1,
                                        textTransform: 'none'
                                    }}
                                >
                                    {isPushingData ? 'Đang push...' : 'Push to DB'}
                                </Button>
                            </Box>
                            
                            {/* Display each action */}
                            {filteredActions.map((action, index) => {
                                const memberCreatorId = action.memberCreator?.id;
                                const memberCreator = members.find(m => m.id === memberCreatorId);
                                const memberCreatorRole = memberCreator?.role || 'Unknown';
                                
                                // Get member being added information
                                const memberAddedId = action.data?.member?.id;
                                const memberAdded = members.find(m => m.id === memberAddedId);
                                const memberAddedRole = memberAdded?.role || 'Unknown';
                                
                                return (
                                <Paper 
                                    key={action.id || index} 
                                    sx={{ 
                                        p: 2, 
                                        mb: 2, 
                                        border: '1px solid #e0e0e0',
                                        backgroundColor: '#fafafa',
                                        borderRadius: 2
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                                            Action #{index + 1}
                                        </Typography>
                                        <Chip 
                                            label={new Date(action.date).toLocaleString('vi-VN')}
                                            size="small"
                                            color="primary"
                                            variant="outlined"
                                        />
                                    </Box>
                                    
                                    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                Member Creator:
                                            </Typography>
                                            <Typography variant="body2">
                                                {memberCreator?.fullName || memberCreator?.username || action.memberCreator?.fullName || action.memberCreator?.username || 'Unknown'}
                                            </Typography>
                                            <Chip 
                                                label={memberCreatorRole.toUpperCase()} 
                                                size="small"
                                                color={memberCreatorRole === 'TS' ? 'primary' : memberCreatorRole === 'CS' ? 'secondary' : 'default'}
                                                variant="outlined"
                                                sx={{ mt: 0.5, fontSize: '0.75rem' }}
                                            />
                                        </Box>
                                        <Box>
                                            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                                Member Added:
                                            </Typography>
                                            <Typography variant="body2">
                                                {memberAdded?.fullName || memberAdded?.username || action.data?.member?.fullName || action.data?.member?.username || 'Unknown'}
                                            </Typography>
                                            <Chip 
                                                label={memberAddedRole.toUpperCase()} 
                                                size="small"
                                                color={memberAddedRole === 'TS' ? 'primary' : memberAddedRole === 'CS' ? 'secondary' : 'default'}
                                                variant="outlined"
                                                sx={{ mt: 0.5, fontSize: '0.75rem' }}
                                            />
                                        </Box>
                                    </Box>
                                    
                                    <Box sx={{ mb: 1 }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                            Card:
                                        </Typography>
                                        <Typography variant="body2">
                                            {action.data?.card?.name || 'Unknown Card'}
                                        </Typography>
                                    </Box>
                                    
                                    <Box>
                                        <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
                                            Action ID:
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>
                                            {action.id}
                                        </Typography>
                                    </Box>
                                </Paper>
                                );
                            })}
                        </Box>
                    )}
                    
                    {addMemberActions.length === 0 && !isAddMemberLoading && selectedDate && (
                        <Box sx={{ mt: 3, textAlign: 'center', py: 2 }}>
                            <Typography variant="body1" color="text.secondary">
                                Không có addMemberToCard actions nào trong ngày đã chọn
                            </Typography>
                        </Box>
                    )}
                    
                    {addMemberActions.length > 0 && filteredActions.length === 0 && (selectedRole !== 'all' || selectedAddedRole !== 'all') && (
                        <Box sx={{ mt: 3, textAlign: 'center', py: 2 }}>
                            <Typography variant="body1" color="text.secondary">
                                Không có actions nào phù hợp với bộ lọc đã chọn
                                {selectedRole !== 'all' && ` (Creator: ${selectedRole.toUpperCase()})`}
                                {selectedAddedRole !== 'all' && ` (Added: ${selectedAddedRole.toUpperCase()})`}
                            </Typography>
                        </Box>
                    )}
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

                {/* Phần quản lý Webhook */}
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>
                        Quản lý Webhook
                    </Typography>
                    
                    {/* Get Webhooks */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                            Lấy danh sách Webhooks
                        </Typography>
                        <Button 
                            variant="contained" 
                            onClick={handleGetWebhooks}
                            disabled={isLoading}
                            sx={{ 
                                minWidth: 200,
                                borderRadius: 1
                            }}
                        >
                            Lấy danh sách Webhooks
                        </Button>
                    </Box>

                    {/* Create Webhook */}
                    <Box sx={{ mb: 3 }}>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                            Tạo Webhook mới
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <TextField
                                label="Callback URL"
                                value={webhookFormData.callbackURL}
                                onChange={(e) => setWebhookFormData({ ...webhookFormData, callbackURL: e.target.value })}
                                fullWidth
                                placeholder="https://your-domain.com/webhook"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                            />
                            <TextField
                                label="Description"
                                value={webhookFormData.description}
                                onChange={(e) => setWebhookFormData({ ...webhookFormData, description: e.target.value })}
                                fullWidth
                                placeholder="Mô tả webhook"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                            />
                            <TextField
                                label="Model ID"
                                value={webhookFormData.idModel}
                                onChange={(e) => setWebhookFormData({ ...webhookFormData, idModel: e.target.value })}
                                fullWidth
                                placeholder="ID của board, card, list, etc."
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                            />
                            <Button 
                                variant="contained" 
                                onClick={handleCreateWebhook}
                                disabled={isLoading}
                                sx={{ 
                                    alignSelf: 'flex-start',
                                    minWidth: 120,
                                    borderRadius: 1,
                                    textTransform: 'none',
                                    fontWeight: 'bold'
                                }}
                            >
                                Tạo Webhook
                            </Button>
                        </Box>
                    </Box>

                    {/* Delete Webhook */}
                    <Box>
                        <Typography variant="subtitle1" sx={{ mb: 2, fontWeight: 500 }}>
                            Xóa Webhook
                        </Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                label="Webhook ID"
                                fullWidth
                                placeholder="Nhập ID của webhook cần xóa"
                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1 } }}
                                onChange={(e) => setWebhookFormData({ ...webhookFormData, idModel: e.target.value })}
                            />
                            <Button 
                                variant="contained" 
                                color="error"
                                onClick={() => handleDeleteWebhook(webhookFormData.idModel)}
                                disabled={isLoading}
                                sx={{ 
                                    minWidth: 120,
                                    height: '56px',
                                    borderRadius: 1
                                }}
                            >
                                Xóa Webhook
                            </Button>
                        </Box>
                    </Box>
                </Paper>
                <Paper sx={{ p: 3, borderRadius: 2, boxShadow: 3 }}>
                    <Typography variant="h6" sx={{ mb: 3, color: 'primary.main', fontWeight: 'bold' }}>QA Cards</Typography>
                    <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>Kiểm tra cards quá hạn trong cột Waiting for Customer's Confirmation (SLA: 2 days)</Typography>
                    <Button 
                        variant="contained" 
                        onClick={handleProcessQaCards}
                        disabled={isQaLoading}
                        sx={{ 
                            minWidth: 200,
                            borderRadius: 1
                        }}
                    >
                        Lấy QA Cards
                    </Button>

                    {/* QA Results Box */}
                    {overdueCards.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                            <Typography variant="h6" color="error.main" sx={{ mb: 2 }}>
                                ⚠️ Có {overdueCards.length} card(s) quá hạn
                            </Typography>
                            
                            {overdueCards.map((card, index) => (
                                <Paper 
                                    key={card.cardId} 
                                    onClick={() => handleOpenCardDetail(card.cardId)}
                                    sx={{ 
                                        p: 2, 
                                        mb: 2, 
                                        border: '1px solid #ff4d4f',
                                        backgroundColor: '#fff2f0',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease-in-out',
                                        '&:hover': {
                                            backgroundColor: '#ffebee',
                                            transform: 'translateY(-2px)',
                                            boxShadow: '0 4px 12px rgba(255, 77, 79, 0.2)'
                                        }
                                    }}
                                >
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 600, color: '#d32f2f' }}>
                                            {index + 1}. {card.cardName}
                                        </Typography>
                                        <Chip 
                                            label={`${card.daysOverdue} ngày quá hạn`}
                                            color="error"
                                            size="small"
                                        />
                                    </Box>
                                    
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>Card ID:</strong> {card.cardId}
                                    </Typography>
                                    
                                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                        <strong>Chuyển vào cột:</strong> {new Date(card.movedToConfirmationDate).toLocaleDateString('vi-VN', {
                                            year: 'numeric',
                                            month: '2-digit',
                                            day: '2-digit',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </Typography>
                                    
                                    <Typography variant="body2" color="error.main" sx={{ fontWeight: 500 }}>
                                        <strong>Lỗi:</strong> {card.errorMessage}
                                    </Typography>
                                </Paper>
                            ))}
                        </Box>
                    )}

                    {/* Success Message */}
                    {!isQaLoading && overdueCards.length === 0 && qaLog.includes('Hoàn thành') && (
                        <Box sx={{ mt: 3, textAlign: 'center', py: 2 }}>
                            <Typography variant="h6" color="success.main" sx={{ mb: 1 }}>
                                ✅ Tuyệt vời!
                            </Typography>
                            <Typography variant="body1" color="text.secondary">
                                Không có card nào quá hạn trong cột Waiting for Customer's Confirmation
                            </Typography>
                        </Box>
                    )}
                </Paper>


                {isLoading && (
                    <Box sx={{ mt: 2 }}>
                        <Typography sx={{ mb: 1 }}>{log}</Typography>
                        <LinearProgress variant="determinate" value={progress} />
                    </Box>
                )}

                {isQaLoading && (
                    <Box sx={{ mt: 2 }}>
                        <Typography sx={{ mb: 1 }}>{qaLog}</Typography>
                        <LinearProgress variant="determinate" value={qaProgress} />
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
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <IconButton onClick={handleCloseStatsModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Typography variant="body1" color="text.secondary">
                        Modal này đã được loại bỏ.
                    </Typography>
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

            {/* Webhooks Modal */}
            <Dialog
                open={isWebhooksModalOpen}
                onClose={handleCloseWebhooksModal}
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
                                Webhooks
                            </Typography>
                            {webhooks && (
                                <Chip 
                                    label={`${webhooks.length} webhooks`}
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
                            {webhooks && (
                                <Tooltip title="Copy JSON">
                                    <IconButton 
                                        onClick={handleCopyWebhooksJSON}
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
                            <IconButton onClick={handleCloseWebhooksModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    {webhooks && (
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
                                {JSON.stringify(webhooks, null, 2)}
                            </pre>
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseWebhooksModal}>Đóng</Button>
                </DialogActions>
            </Dialog>

            {/* Thêm button mở dialog tạo conversation */}

            {/* Dialog tạo conversation */}


            {/* Form tạo conversation */}


            {/* CardDetailModal */}
            <CardDetailModal
                open={isCardDetailModalOpen}
                onClose={handleCloseCardDetail}
                cardId={selectedCardId}
            />

            {/* KPI Stats Modal */}
            <Dialog
                open={isKPIStatsModalOpen}
                onClose={handleCloseKPIStatsModal}
                maxWidth="lg"
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
                                📊 Thống kê KPI chi tiết theo App
                            </Typography>
                            <Chip 
                                label={`${Object.keys(kpiStats).length} apps`}
                                size="small"
                                sx={{ 
                                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                                    color: 'success.main',
                                    fontWeight: 500
                                }}
                            />
                        </Box>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Tooltip title="Copy JSON">
                                <IconButton 
                                    onClick={() => {
                                        navigator.clipboard.writeText(JSON.stringify(kpiStats, null, 2))
                                            .then(() => {
                                                setSnackbar({
                                                    open: true,
                                                    message: "Đã sao chép JSON vào clipboard",
                                                    severity: "success"
                                                });
                                            });
                                    }}
                                    sx={{ 
                                        color: 'success.main',
                                        '&:hover': {
                                            backgroundColor: alpha(theme.palette.success.main, 0.1)
                                        }
                                    }}
                                >
                                    <ContentCopyIcon />
                                </IconButton>
                            </Tooltip>
                            <IconButton onClick={handleCloseKPIStatsModal}>
                                <CloseIcon />
                            </IconButton>
                        </Box>
                    </Box>
                </DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 3 }}>
                        {Object.entries(kpiStats).map(([appName, stats]) => (
                            <Paper key={appName} sx={{ 
                                p: 3, 
                                backgroundColor: 'rgba(16, 185, 129, 0.05)',
                                border: '1px solid rgba(16, 185, 129, 0.2)',
                                borderRadius: 2
                            }}>
                                <Typography variant="h6" sx={{ mb: 2, color: 'success.main', fontWeight: 600 }}>
                                    {appName}
                                </Typography>
                                
                                <Box sx={{ mb: 2 }}>
                                    <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                                        📈 Tổng quan:
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary">
                                        • Tổng Cards: <strong>{stats.totalCards}</strong>
                                    </Typography>
                                    <Typography variant="body2" color="success.main" sx={{ fontWeight: 600 }}>
                                        • Tổng KPI Points: <strong>{stats.totalPoints}</strong>
                                    </Typography>
                                </Box>

                                <Box>
                                    <Typography variant="body1" sx={{ fontWeight: 500, mb: 1 }}>
                                        🎯 Phân tích theo Level:
                                    </Typography>
                                    {Object.entries(stats.levelBreakdown).map(([level, levelStats]) => (
                                        <Box key={level} sx={{ 
                                            p: 1, 
                                            mb: 1, 
                                            backgroundColor: 'white', 
                                            borderRadius: 1,
                                            border: '1px solid rgba(0,0,0,0.1)'
                                        }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                                    {level.toUpperCase()}
                                                </Typography>
                                                <Box sx={{ display: 'flex', gap: 1 }}>
                                                    <Chip 
                                                        label={`${levelStats.count} cards`} 
                                                        size="small" 
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                    <Chip 
                                                        label={`${levelStats.points} pts`} 
                                                        size="small" 
                                                        color="success"
                                                    />
                                                </Box>
                                            </Box>
                                        </Box>
                                    ))}
                                </Box>
                            </Paper>
                        ))}
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseKPIStatsModal}>Đóng</Button>
                </DialogActions>
            </Dialog>

        </Box>
    );
};

export default DevZone;
