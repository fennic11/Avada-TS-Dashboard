// Define all available tabs and their paths
export const TABS = {
    BUGS: 'bugs',
    ISSUES: 'issues',
    RESOLUTION_TIME: 'resolution-time',
    DATA_KPI: 'data-kpi',
    TS_LEAD: 'TS-lead-workspace',
    TS_WORKSPACE: 'TS-workspace',
    BA_PAGE: 'ba-page',
    DEV_ZONE: 'dev-zone'
};

// Define roles and their permissions
export const ROLES = {
    ADMIN: 'admin',
    TS: 'ts',
    BA: 'ba'
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
            TABS.TS_WORKSPACE,
            TABS.TS_LEAD
        ],
        description: 'Access to TS related features'
    },
    [ROLES.BA]: {
        allowedTabs: [
            TABS.BUGS,
            TABS.BA_PAGE
        ],
        description: 'Access to BA related features'
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