// src/App.js
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container } from '@mui/material';
import Login from './pages/Login';
import DevZone from './components/DevZone';
import { isAuthenticated, getCurrentUser } from './api/usersApi';
import Header from './components/Header';
import { SnackbarProvider } from 'notistack';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { TABS, ROLES, hasTabAccess, getAccessibleTabs } from './utils/roles';


// Import existing pages
import Bugs from './pages/Dashboard';
import Issues from './pages/Issues';
import RevolutionTime from './pages/RevolutionTime';
import Kpis from './pages/Kpi';
import TSLead from './pages/TSLeadPage';
import TSWorkspace from './pages/TSWorkspace';
import BaPage from './pages/BaPage';
import Slack from './pages/Slack';
import LeaderboardPage from './pages/Leaderboard';
import PlanTsTeam from './pages/PlanTsTeam';
import PerformanceTS from './pages/PerformanceTS';

const theme = createTheme({
    palette: {
        primary: {
            main: '#1976d2',
        },
        secondary: {
            main: '#dc004e',
        },
    },
});

const PrivateRoute = ({ children }) => {
    const location = useLocation();
    const currentPath = location.pathname.substring(1); // Remove leading slash
    
    // First check authentication
    if (!isAuthenticated()) {
        return <Navigate to="/login" />;
    }

    const user = getCurrentUser();
    console.log(user);
    const userRole = user?.role;
    const accessibleTabs = getAccessibleTabs(userRole);
    console.log(accessibleTabs);

    // If no accessible tabs, something is wrong
    if (!accessibleTabs.length) {
        console.error('No accessible tabs for role:', userRole);
        return <Navigate to="/login" />;
    }

    // For root path or empty path, redirect to first accessible tab
    if (!currentPath || currentPath === '') {
        return <Navigate to={`/${accessibleTabs[0]}`} replace />;
    }

    // Check if current path is accessible
    const hasAccess = hasTabAccess(userRole, currentPath);
    console.log('Access check:', { currentPath, userRole, hasAccess, accessibleTabs });

    if (!hasAccess) {
        // Redirect to first accessible tab
        return <Navigate to={`/${accessibleTabs[0]}`} replace />;
    }

    return children;
};

const Layout = ({ children }) => {
    const [sidebarOpen, setSidebarOpen] = React.useState(true);
    const drawerWidth = 220;
    return (
        <Box sx={{ minHeight: '100vh', width: '100%' }}>
            {sidebarOpen && <Header drawerWidth={drawerWidth} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(o => !o)} />}
            {!sidebarOpen && <Header drawerWidth={drawerWidth} sidebarOpen={sidebarOpen} onToggleSidebar={() => setSidebarOpen(o => !o)} />}
            {sidebarOpen ? (
                <Container component="main" maxWidth="xxl" sx={{ flex: 1, py: 3, ml: `${drawerWidth}px`, width: '93%', marginLeft: '10rem', marginRight: 'auto' }}>
                    {children}
                </Container>
            ) : (
                <Container component="main" maxWidth="xxl" sx={{ flex: 1, py: 3 }}>
                    {children}
                </Container>
            )}
        </Box>
    );
};

const App = () => {
    return (
        <GoogleOAuthProvider clientId="429700743126-kftvivto5mp4s8n9pvvius8jjsaej3cv.apps.googleusercontent.com">
            <SnackbarProvider maxSnack={3}>
                <ThemeProvider theme={theme}>
                    <CssBaseline />
                    <Router>
                        <Routes>
                            <Route path="/login" element={<Login />} />
                            <Route
                                path="/dev-zone"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <DevZone />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/bugs"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <Bugs />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/issues"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <Issues />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/resolution-time"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <RevolutionTime />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/data-kpi"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <Kpis />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/TS-lead-workspace"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <TSLead />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />  
                            <Route
                                path="/TS-workspace"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <TSWorkspace />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/ba-page"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <BaPage />
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/slack-channel"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <Slack />   
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/leaderboard"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <LeaderboardPage /> 
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />
                            <Route
                                path="/performance-ts"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <PerformanceTS />
                                        </Layout>   
                                    </PrivateRoute>
                                }
                            />
                            <Route path="/" element={<Navigate to="/bugs" replace />} />
                            <Route path="*" element={<Navigate to="/" replace />} />
                            <Route
                                path="/plan-ts-team"
                                element={
                                    <PrivateRoute>
                                        <Layout>
                                            <PlanTsTeam />  
                                        </Layout>
                                    </PrivateRoute>
                                }
                            />
                        </Routes>
                    </Router>
                </ThemeProvider>
            </SnackbarProvider>
        </GoogleOAuthProvider>
    );
};

export default App;
