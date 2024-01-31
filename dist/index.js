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
const axios_1 = __importDefault(require("axios"));
const fs = __importStar(require("fs")); // Import the file system module
const node_path_1 = __importDefault(require("node:path"));
const dotenv_1 = __importDefault(require("dotenv"));
const promises_1 = __importDefault(require("fs/promises"));
// TODO: Remove after running on GitHub runner.
dotenv_1.default.config();
// TODO: Build for scenarios: only dashboards, only reports, dashboards & reports.
// TODO: Account for all possible bad inputs.
// let CONNECTION_TYPE = 'self-managed';
// const BASE_ADDRESS = 'https://akstest.apendo.se/optimize'
// const COLLECTION_ID = '0c51a9c1-33ba-4a2e-a7a1-b2b148f4a539';
let CONNECTION_TYPE = 'cloud';
const BASE_ADDRESS = 'https://bru-2.optimize.camunda.io/eac012f7-4678-43b7-bfef-77d78071ddce';
const COLLECTION_ID = '73eac2ad-6f12-46f0-aac3-ab12e9ea1184';
const getTokenCloud = async () => {
    try {
        const url = 'https://login.cloud.camunda.io/oauth/token';
        const data = {
            grant_type: 'client_credentials',
            audience: 'optimize.camunda.io',
            client_id: process.env.CLOUD_CLIENT_ID, // Use environment variable
            client_secret: process.env.CLOUD_CLIENT_SECRET //
        };
        const response = await axios_1.default.post(url, data, {
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
        // setFailed(error instanceof Error ? error.message : 'An error occurred');
        // return null;
    }
};
const getTokenSelfManaged = async () => {
    try {
        const url = 'https://akstest.apendo.se/auth/realms/camunda-platform/protocol/openid-connect/token';
        const data = {
            grant_type: 'client_credentials',
            audience: 'optimize-api',
            client_id: process.env.SM_CLIENT_ID,
            client_secret: process.env.SM_CLIENT_SECRET
        };
        const response = await axios_1.default.post(url, data, {
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
        // setFailed(error instanceof Error ? error.message : 'An error occurred');
        // return null;
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
        console.error('Error', error);
    }
};
const getOptimizeDashboardIds = async () => {
    const url = `${BASE_ADDRESS}/api/public/dashboard?collectionId=${COLLECTION_ID}`;
    const token = await getTokenByConnectionType();
    if (!token) {
        console.error('Failed to retrieve token.');
        return; // or throw new Error('Failed to retrieve token.');
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
        console.error('Error:', error);
    }
};
const getOptimizeReportIds = async () => {
    const url = `${BASE_ADDRESS}/api/public/report?collectionId=${COLLECTION_ID}`;
    const token = await getTokenByConnectionType();
    if (!token) {
        console.error('Failed to retrieve token.');
        return; // or throw new Error('Failed to retrieve token.');
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
        console.error('Error:', error);
    }
};
const exportDashboardDefinitions = async (reportIds) => {
    const url = `${BASE_ADDRESS}/api/public/export/dashboard/definition/json`;
    const token = await getTokenByConnectionType();
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    try {
        const response = await axios_1.default.post(url, reportIds, { headers });
        return response.data;
    }
    catch (error) {
        console.error('Error:', error);
    }
};
const exportReportDefinitions = async (reportIds) => {
    const url = `${BASE_ADDRESS}/api/public/export/report/definition/json`;
    const token = await getTokenByConnectionType();
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };
    try {
        const response = await axios_1.default.post(url, reportIds, { headers });
        return response.data;
    }
    catch (error) {
        console.error('Error:', error);
    }
};
const writeOptimizeEntityToFile = async (optimizeEntityData, destinationFolderPath) => {
    try {
        // TODO: Is fixed filename the best solution?
        const fileName = 'optimize-entities.json';
        const destinationFilePath = node_path_1.default.join(destinationFolderPath, `${fileName}`);
        if (!fs.existsSync(destinationFilePath)) {
            await promises_1.default.mkdir(destinationFolderPath, { recursive: true });
        }
        // Convert optimizeEntityData to a JSON string
        const dataToWrite = JSON.stringify(optimizeEntityData, null, 2);
        await promises_1.default.writeFile(destinationFilePath, dataToWrite);
        console.log(`File content saved to: ${destinationFilePath}`);
    }
    catch (error) {
        console.error('Error writing file:', error);
        // setFailed(error instanceof Error ? error.message : 'An error occurred');
    }
};
const runWorkflow = async () => {
    try {
        const dashboardIds = await getOptimizeDashboardIds();
        // const reportIds = await getOptimizeReportIds(TOKEN)
        const dashboardDefinitions = await exportDashboardDefinitions(dashboardIds);
        // const reportDefinitions = await exportReportDefinitions(TOKEN, reportIds)
        await writeOptimizeEntityToFile(dashboardDefinitions, 'optimize');
        // await writeOptimizeEntityToFile(reportDefinitions, 'optimize')
        // console.log('Dashboard Definitions: : ', JSON.stringify(optimizeDataFromFile, null, 2));
    }
    catch (error) {
        console.error('Error:', error);
        // setFailed(error instanceof Error ? error.message : 'An error occurred');
    }
};
runWorkflow()
    .then(() => {
    console.log("Workflow completed successfully.");
})
    .catch((error) => {
    console.error("Workflow failed:", error);
});