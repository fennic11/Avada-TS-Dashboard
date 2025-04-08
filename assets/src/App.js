// src/App.js
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { Box, Container } from '@mui/material';
import Login from './pages/Login';
import DevZone from './components/DevZone';
import { isAuthenticated } from './api/usersApi';
import Header from './components/Header';

import Bugs from './pages/Dashboard';
import Issues from './pages/Issues'; // ví dụ thêm trang khác
import RevolutionTime from './pages/RevolutionTime';
import Kpis from './pages/Kpi';
import TSLead from './pages/TSLeadPage';
import TSWorkspace from './pages/TSWorkspace';

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
    return isAuthenticated() ? children : <Navigate to="/login" />;
};

const Layout = ({ children }) => {
    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
            <Header />
            <Container component="main" maxWidth="xxl" sx={{ flex: 1, py: 3 }}>
                {children}
            </Container>
        </Box>
    );
};

function App() {
    return (
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
                </Routes>
            </Router>
        </ThemeProvider>
    );
}

export default App;
