"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@actions/core");
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs"));
const node_path_1 = __importDefault(require("node:path"));
const promises_1 = __importDefault(require("fs/promises"));
const OPTIMIZE_API_URL = (0, core_1.getInput)('optimize_api_url');
const COLLECTION_ID = (0, core_1.getInput)('collection_id');
const CONNECTION_TYPE = (0, core_1.getInput)('connection_type');
const DESTINATION = (0, core_1.getInput)('destination');
const CLIENT_ID = (0, core_1.getInput)('client_id');
const CLIENT_SECRET = (0, core_1.getInput)('client_secret');
const AUDIENCE = (0, core_1.getInput)('audience');
const AUTH_SERVER_URL = (0, core_1.getInput)('auth_server_url');
const getTokenCloud = async () => {
    try {
        const data = {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            audience: AUDIENCE,
            grant_type: 'client_credentials'
        };
        const response = await axios_1.default.post(AUTH_SERVER_URL, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        if (response.status === 200) {
            const token = response.data.access_token;
            // Remove all whitespaces from token
            return token.replace(/\s+/g, '');
        }
        else {
            console.error('Error:', response.statusText);
            return null;
        }
    }
    catch (error) {
        (0, core_1.setFailed)(error instanceof Error ? error.message : 'An error occurred');
        return null;
    }
};
const getTokenSelfManaged = async () => {
    try {
        const data = {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            audience: AUDIENCE,
            grant_type: 'client_credentials'
        };
        const response = await axios_1.default.post(AUTH_SERVER_URL, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });
        if (response.status === 200) {
            const token = response.data.access_token;
            // Remove all whitespaces from token
            return token.replace(/\s+/g, '');
        }
        else {
            console.error('Error:', response.statusText);
            return null;
        }
    }
    catch (error) {
        (0, core_1.setFailed)(error instanceof Error ? error.message : 'An error occurred');
        return null;
    }
};
const getTokenByConnectionType = async () => {
    try {
        if (CONNECTION_TYPE === 'cloud') {
            return await getTokenCloud();
        }
        else if (CONNECTION_TYPE === 'self-managed') {
            return await getTokenSelfManaged();
        }
        else {
            console.error('Invalid connection_type specified.');
            return false;
        }
    }
    catch (error) {
        (0, core_1.setFailed)(error instanceof Error ? error.message : 'An error occurred');
    }
};
const getOptimizeDashboardIds = async () => {
    const url = `${OPTIMIZE_API_URL}/api/public/dashboard?collectionId=${COLLECTION_ID}`;
    const token = await getTokenByConnectionType();
    if (!token) {
        console.error('Failed to retrieve token.');
        return;
    }
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    try {
        const response = await axios_1.default.get(url, { headers });
        return response.data.map((report) => report.id);
    }
    catch (error) {
        (0, core_1.setFailed)(error instanceof Error ? error.message : 'An error occurred');
    }
};
const getOptimizeReportIds = async () => {
    const url = `${OPTIMIZE_API_URL}/api/public/report?collectionId=${COLLECTION_ID}`;
    const token = await getTokenByConnectionType();
    if (!token) {
        console.error('Failed to retrieve token.');
        return; // or throw new Error('Failed to retrieve token.')
    }
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    try {
        const response = await axios_1.default.get(url, { headers });
        return response.data.map((report) => report.id);
    }
    catch (error) {
        (0, core_1.setFailed)(error instanceof Error ? error.message : 'An error occurred');
    }
};
const exportDashboardDefinitions = async (reportIds) => {
    const url = `${OPTIMIZE_API_URL}/api/public/export/dashboard/definition/json`;
    const token = await getTokenByConnectionType();
    if (!token) {
        console.error('Failed to retrieve token.');
        return;
    }
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    try {
        const response = await axios_1.default.post(url, reportIds, { headers });
        return response.data;
    }
    catch (error) {
        (0, core_1.setFailed)(error instanceof Error ? error.message : 'An error occurred');
    }
};
const exportReportDefinitions = async (reportIds) => {
    const url = `${OPTIMIZE_API_URL}/api/public/export/report/definition/json`;
    const token = await getTokenByConnectionType();
    if (!token) {
        console.error('Failed to retrieve token.');
        return;
    }
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    try {
        const response = await axios_1.default.post(url, reportIds, { headers });
        return response.data;
    }
    catch (error) {
        (0, core_1.setFailed)(error instanceof Error ? error.message : 'An error occurred');
    }
};
const isValidPath = async (destinationFolderPath) => {
    // Check if the destination path is empty or only contains whitespaces
    if (!destinationFolderPath || destinationFolderPath.trim().length === 0) {
        console.error('Destination path is empty.');
        return false;
    }
    const isInvalidPath = (path) => {
        // Regex to find invalid characters. In Ubuntu, aside from `/` at the start or middle,
        // other characters like `*`, `?`, `"`, `<`, `>`, `|`, and null byte are not allowed in names.
        // This regex does not catch every possible invalid character but covers many common cases.
        const invalidCharsOrPattern = /[*?"<>|]|\/|\0/;
        return invalidCharsOrPattern.test(path);
    };
    // Check if the path is absolute or contains invalid characters
    if (node_path_1.default.isAbsolute(destinationFolderPath) || isInvalidPath(destinationFolderPath)) {
        console.error('Destination path is invalid or contains invalid characters.');
        return false;
    }
    else {
        return true;
    }
};
const writeOptimizeEntityToFile = async (optimizeEntityData, destinationFolderPath) => {
    try {
        const validatedDestinationPath = await isValidPath(destinationFolderPath);
        if (!validatedDestinationPath) {
            console.log('Invalid destination path.');
            process.exit(1);
        }
        const fileName = 'optimize-entities.json';
        const destinationFilePath = node_path_1.default.join(destinationFolderPath, `${fileName}`);
        if (!optimizeEntityData || optimizeEntityData.length === 0) {
            console.log('No Optimize artifacts found.');
        }
        if (!fs.existsSync(destinationFilePath)) {
            await promises_1.default.mkdir(destinationFolderPath, { recursive: true });
        }
        // Convert optimizeEntityData to a JSON string
        const dataToWrite = JSON.stringify(optimizeEntityData, null, 2);
        await promises_1.default.writeFile(destinationFilePath, dataToWrite);
        console.log(`File content saved to: ${destinationFilePath}`);
    }
    catch (error) {
        (0, core_1.setFailed)(error instanceof Error ? error.message : 'An error occurred');
    }
};
const runWorkflow = async () => {
    try {
        const dashboardIds = await getOptimizeDashboardIds();
        // Write only report definitions.
        if (!dashboardIds || dashboardIds.length === 0) {
            const reportIds = await getOptimizeReportIds();
            const reportDefinitions = await exportReportDefinitions(reportIds);
            await writeOptimizeEntityToFile(reportDefinitions, DESTINATION);
        }
        else {
            const reportIds = await getOptimizeReportIds();
            // Write only dashboard definitions.
            if (!reportIds || reportIds.length === 0) {
                const dashboardDefinitions = await exportDashboardDefinitions(dashboardIds);
                await writeOptimizeEntityToFile(dashboardDefinitions, DESTINATION);
            }
            else {
                // Write both reports and dashboards.
                const reportDefinitions = await exportReportDefinitions(reportIds);
                const dashboardDefinitions = await exportDashboardDefinitions(dashboardIds);
                const combinedDefinitions = reportDefinitions.concat(dashboardDefinitions);
                await writeOptimizeEntityToFile(combinedDefinitions, DESTINATION);
            }
        }
    }
    catch (error) {
        (0, core_1.setFailed)(error instanceof Error ? error.message : 'An error occurred');
    }
};
runWorkflow()
    .then(() => {
    console.log("Workflow completed successfully.");
})
    .catch((error) => {
    (0, core_1.setFailed)(error instanceof Error ? error.message : 'An error occurred');
    process.exit(1);
});
