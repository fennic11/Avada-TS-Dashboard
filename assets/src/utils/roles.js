// Define all available tabs and their paths
export const TABS = {
    BUGS: 'bugs',
    ISSUES: 'issues',
    RESOLUTION_TIME: 'resolution-time',
    DEV_RESOLUTION_TIME: 'dev-resolution-time',
    DATA_KPI: 'data-kpi',
    TS_LEAD: 'TS-lead-workspace',
    // TS_WORKSPACE: 'TS-workspace',
    BA_PAGE: 'ba-page',
    DEV_ZONE: 'dev-zone',
    SLACK_CHANNEL: 'slack-channel',
    // LEADERBOARD: 'leaderboard',
    // PLAN_TS_TEAM: 'plan-ts-team',
    PERFORMANCE_TS: 'performance-ts',
    CHECKOUT: 'checkout',
    KPI_TS_TEAM: 'kpi-ts-team',
    ERROR_CARDS: 'error-cards'
};

// Define roles and their permissions
export const ROLES = {
    ADMIN: 'admin',
    TS: 'ts',
    BA: 'ba',
    DEV: 'dev',
    TS_LEAD: 'ts-lead',
    PM: 'pm',
    CSL: 'csl'
};

// Define permissions for each role
export const ROLE_PERMISSIONS = {
    [ROLES.ADMIN]: {
        allowedTabs: Object.values(TABS),
        description: 'Full access to all features'
    },
    [ROLES.TS]: {
        allowedTabs: [
            TABS.BUGS,
            TABS.ISSUES,
            TABS.RESOLUTION_TIME,
            // TABS.TS_WORKSPACE,
            TABS.CHECKOUT,
            TABS.KPI_TS_TEAM
        ],
        description: 'Access to TS related features'
    },
    [ROLES.BA]: {
        allowedTabs: [
            TABS.BUGS,
            TABS.BA_PAGE
        ],
        description: 'Access to BA related features'
    },
    [ROLES.PM]: {
        allowedTabs: [
            TABS.BUGS,
            TABS.BA_PAGE,
            TABS.ISSUES,
            TABS.DEV_RESOLUTION_TIME
        ],
        description: 'Access to PM related features'
    },
    [ROLES.DEV]: {
        allowedTabs: [
            TABS.BUGS,
            TABS.ISSUES,
            TABS.DEV_RESOLUTION_TIME
        ],
        description: 'Access to Dev related features'
    },
    [ROLES.TS_LEAD]: {
        allowedTabs: [
            TABS.BUGS,
            TABS.RESOLUTION_TIME,
            TABS.DATA_KPI,
            TABS.ISSUES,
            TABS.TS_LEAD,
            TABS.DEV_RESOLUTION_TIME,
            // TABS.TS_WORKSPACE,
            // TABS.SLACK_CHANNEL,
            TABS.PERFORMANCE_TS,
            TABS.CHECKOUT,
            TABS.KPI_TS_TEAM,
            TABS.ERROR_CARDS
        ],
        description: 'Access to TS Lead related features'
        },
    [ROLES.PLAN_TS_TEAM]: {
        allowedTabs: [
            TABS.PLAN_TS_TEAM
        ],
        description: 'Access to Plan Ts Team related features'
    },
    [ROLES.CSL]: {
        allowedTabs: [
            TABS.BUGS,
            TABS.DEV_RESOLUTION_TIME,
            TABS.PERFORMANCE_TS,
        ],
        description: 'Access to CSL related features'
    }
};

// Helper function to check if a user has access to a specific tab
export const hasTabAccess = (userRole, path) => {
    if (!userRole || !path) return false;
    
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    if (!rolePermissions) return false;

    // Convert path and allowed tabs to lowercase for comparison
    const normalizedPath = path.toLowerCase();
    const allowedPaths = rolePermissions.allowedTabs.map(tab => tab.toLowerCase());

    // Check if the normalized path is included in allowed paths
    return allowedPaths.includes(normalizedPath);
};

// Helper function to get all accessible tabs for a role
export const getAccessibleTabs = (userRole) => {
    if (!userRole) return [];
    
    const rolePermissions = ROLE_PERMISSIONS[userRole];
    if (!rolePermissions) return [];
    
    return rolePermissions.allowedTabs;
}; 