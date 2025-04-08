import React from "react";
import {
    Avatar,
    Card,
    CardHeader,
    CardContent,
    Typography,
    Box
} from "@mui/material";
import { format } from "date-fns";



const CardActivityHistory = ({ actions }: { actions: any[] }) => {
    return (
        <Box display="flex" flexDirection="column" gap={2}>
            {actions.map((action) => {
                const {
                    id,
                    type,
                    date,
                    memberCreator,
                    data,
                } = action;

                const timeFormatted = format(new Date(date), "dd/MM/yyyy HH:mm:ss");

                const renderContent = () => {
                    switch (type) {
                        case "commentCard":
                            return (
                                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                                    {data.text}
                                </Typography>
                            );
                        case "updateCard":
                            const from = data.listBefore?.name;
                            const to = data.listAfter?.name;
                            if (from && to) {
                                return (
                                    <Typography variant="body2">
                                        Moved card from <strong>{from}</strong> to <strong>{to}</strong>.
                                    </Typography>
                                );
                            }
                            return (
                                <Typography variant="body2" color="text.secondary">
                                    Updated card.
                                </Typography>
                            );
                        default:
                            return (
                                <Typography variant="body2" color="text.secondary">
                                    Other action type.
                                </Typography>
                            );
                    }
                };

                return (
                    <Card key={id} elevation={2}>
                        <CardHeader
                            avatar={
                                <Avatar
                                    src={memberCreator.avatarUrl}
                                    alt={memberCreator.fullName}
                                >
                                    {memberCreator.initials || memberCreator.fullName.slice(0, 2)}
                                </Avatar>
                            }
                            title={
                                <Typography variant="subtitle1" fontWeight="bold">
                                    {memberCreator.fullName}
                                </Typography>
                            }
                            subheader={timeFormatted}
                            sx={{ paddingBottom: 0 }}
                        />
                        <CardContent>
                            {renderContent()}
                        </CardContent>
                    </Card>
                );
            })}
        </Box>
    );
};

export default CardActivityHistory;
