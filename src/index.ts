import axios, {AxiosResponse} from 'axios';
import * as fs from 'fs'; // Import the file system module
import path from "node:path";
import dotenv from 'dotenv';
import fsPromises from 'fs/promises';

// TODO: Remove after running on GitHub runner.
dotenv.config();

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
            client_id: process.env.CLOUD_CLIENT_ID,       // Use environment variable
            client_secret: process.env.CLOUD_CLIENT_SECRET //
        };

        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            const token = response.data.access_token

            // Remove all whitespaces from token
            return token.replace(/\s+/g, '');

        } else {
            console.error('Error:', response.statusText);
            return null;
        }
    } catch (error) {
        // setFailed(error instanceof Error ? error.message : 'An error occurred');
        // return null;
    }
}

const getTokenSelfManaged = async () => {

    try {
        const url = 'https://akstest.apendo.se/auth/realms/camunda-platform/protocol/openid-connect/token';
        const data = {
            grant_type: 'client_credentials',
            audience: 'optimize-api',
            client_id: process.env.SM_CLIENT_ID,
            client_secret: process.env.SM_CLIENT_SECRET
        };

        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.status === 200) {
            const token = response.data.access_token

            // Remove all whitespaces from token
            return token.replace(/\s+/g, '');

        } else {
            console.error('Error:', response.statusText);
            return null;
        }
    } catch (error) {
        // setFailed(error instanceof Error ? error.message : 'An error occurred');
        // return null;
    }
}

const getTokenByConnectionType = async () => {

    try {
        if (CONNECTION_TYPE === 'cloud') {

            return await getTokenCloud()

        } else if (CONNECTION_TYPE === 'self-managed') {

            return await getTokenSelfManaged()

        } else {
            console.error('Invalid connection_type specified.');
            return false;
        }

    } catch (error) {
        console.error('Error', error)
    }

}


const getOptimizeDashboardIds = async () => {

    const url = `${BASE_ADDRESS}/api/public/dashboard?collectionId=${COLLECTION_ID}`;
    const token = await getTokenByConnectionType()

    if (!token) {
        console.error('Failed to retrieve token.');
        return; // or throw new Error('Failed to retrieve token.');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const response = await axios.get(url, {headers});
        return response.data.map((report: { id: any; }) => report.id)

    } catch (error) {
        console.error('Error:', error);
    }

}

const getOptimizeReportIds = async () => {

    const url = `${BASE_ADDRESS}/api/public/report?collectionId=${COLLECTION_ID}`;
    const token = await getTokenByConnectionType()

    if (!token) {
        console.error('Failed to retrieve token.');
        return; // or throw new Error('Failed to retrieve token.');
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const response = await axios.get(url, {headers});
        return response.data.map((report: { id: any; }) => report.id)

    } catch (error) {
        console.error('Error:', error);
    }

}

const exportDashboardDefinitions = async (reportIds: string[]) => {

    const url = `${BASE_ADDRESS}/api/public/export/dashboard/definition/json`
    const token = await getTokenByConnectionType()

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const response: AxiosResponse = await axios.post(url, reportIds, {headers});
        return response.data;

    } catch (error) {
        console.error('Error:', error);
    }
};

const exportReportDefinitions = async (reportIds: string[]) => {

    const url = `${BASE_ADDRESS}/api/public/export/report/definition/json`
    const token = await getTokenByConnectionType()

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const response: AxiosResponse = await axios.post(url, reportIds, {headers});
        return response.data;

    } catch (error) {
        console.error('Error:', error);
    }
};


const writeOptimizeEntityToFile = async (optimizeEntityData: any, destinationFolderPath: string): Promise<void> => {
    try {
        // TODO: Is fixed filename the best solution?
        const fileName = 'optimize-entities.json'
        const destinationFilePath = path.join(destinationFolderPath, `${fileName}`);

        if (!fs.existsSync(destinationFilePath)) {

            await fsPromises.mkdir(destinationFolderPath, {recursive: true});
        }

        // Convert optimizeEntityData to a JSON string
        const dataToWrite = JSON.stringify(optimizeEntityData, null, 2);
        await fsPromises.writeFile(destinationFilePath, dataToWrite);

        console.log(`File content saved to: ${destinationFilePath}`);

    } catch (error) {
        console.error('Error writing file:', error);
        // setFailed(error instanceof Error ? error.message : 'An error occurred');
    }
};


const runWorkflow = async () => {
    try {

        const dashboardIds = await getOptimizeDashboardIds()
        // const reportIds = await getOptimizeReportIds(TOKEN)

        const dashboardDefinitions = await exportDashboardDefinitions(dashboardIds)
        // const reportDefinitions = await exportReportDefinitions(TOKEN, reportIds)

        await writeOptimizeEntityToFile(dashboardDefinitions, 'optimize')
        // await writeOptimizeEntityToFile(reportDefinitions, 'optimize')

        // console.log('Dashboard Definitions: : ', JSON.stringify(optimizeDataFromFile, null, 2));

    } catch (error) {
        console.error('Error:', error);
        // setFailed(error instanceof Error ? error.message : 'An error occurred');
    }

}

runWorkflow()
    .then(() => {
        console.log("Workflow completed successfully.");
    })
    .catch((error) => {
        console.error("Workflow failed:", error);
    });