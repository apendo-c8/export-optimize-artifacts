import {getInput, setFailed} from "@actions/core";
import axios, {AxiosResponse} from 'axios';
import * as fs from 'fs';
import path from "node:path";
import fsPromises from 'fs/promises';

const OPTIMIZE_API_URL = getInput('optimize_api_url');
const COLLECTION_ID = getInput('collection_id');
const CONNECTION_TYPE = getInput('connection_type');
const DESTINATION = getInput('destination');
const CLIENT_ID = getInput('client_id');
const CLIENT_SECRET = getInput('client_secret');
const AUDIENCE = getInput('audience');
const AUTH_SERVER_URL = getInput('auth_server_url');

const getTokenCloud = async () => {
    try {

        const data = {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            audience: AUDIENCE,
            grant_type: 'client_credentials'
        };

        const response = await axios.post(AUTH_SERVER_URL, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            const token = response.data.access_token;

            // Remove all whitespaces from token
            return token.replace(/\s+/g, '');

        } else {
            console.error('Error:', response.statusText);
            return null;
        }
    } catch (error) {

        setFailed(error instanceof Error ? error.message : 'An error occurred');
        return null;
    }
}

const getTokenSelfManaged = async () => {

    try {

        const data = {
            client_id: CLIENT_ID,
            client_secret: CLIENT_SECRET,
            audience: AUDIENCE,
            grant_type: 'client_credentials'
        };

        const response = await axios.post(AUTH_SERVER_URL, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        });

        if (response.status === 200) {
            const token = response.data.access_token;

            // Remove all whitespaces from token
            return token.replace(/\s+/g, '');

        } else {
            console.error('Error:', response.statusText);
            return null;
        }
    } catch (error) {

        setFailed(error instanceof Error ? error.message : 'An error occurred');
        return null;
    }
}

const getTokenByConnectionType = async () => {

    try {
        if (CONNECTION_TYPE === 'cloud') {

            return await getTokenCloud();

        } else if (CONNECTION_TYPE === 'self-managed') {

            return await getTokenSelfManaged();

        } else {
            console.error('Invalid connection_type specified.');
            return false;
        }

    } catch (error) {

        setFailed(error instanceof Error ? error.message : 'An error occurred');
    }

}

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
        const response = await axios.get(url, {headers});
        return response.data.map((report: { id: any; }) => report.id)

    } catch (error) {

        setFailed(error instanceof Error ? error.message : 'An error occurred');
    }

}

const getOptimizeReportIds = async () => {

    const url = `${OPTIMIZE_API_URL}/api/public/report?collectionId=${COLLECTION_ID}`;
    const token = await getTokenByConnectionType()

    if (!token) {
        console.error('Failed to retrieve token.');
        return; // or throw new Error('Failed to retrieve token.')
    }

    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
    };

    try {
        const response = await axios.get(url, {headers});
        return response.data.map((report: { id: any; }) => report.id);

    } catch (error) {

        setFailed(error instanceof Error ? error.message : 'An error occurred');
    }

}

const exportDashboardDefinitions = async (reportIds: string[]) => {

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
        const response: AxiosResponse = await axios.post(url, reportIds, {headers});
        return response.data;

    } catch (error) {

        setFailed(error instanceof Error ? error.message : 'An error occurred');
    }
};

const exportReportDefinitions = async (reportIds: string[]) => {

    const url = `${OPTIMIZE_API_URL}/api/public/export/report/definition/json`
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
        const response: AxiosResponse = await axios.post(url, reportIds, {headers});
        return response.data;

    } catch (error) {

        setFailed(error instanceof Error ? error.message : 'An error occurred');

    }
};

const isValidPath = async (destinationFolderPath: string): Promise<boolean> => {

    // Check if the destination path is empty or only contains whitespaces
    if (!destinationFolderPath || destinationFolderPath.trim().length === 0) {
        console.error('Destination path is empty.');
        return false;
    }

    const isInvalidPath = (path: string): boolean => {
        // Regex to find invalid characters. In Ubuntu, aside from `/` at the start or middle,
        // other characters like `*`, `?`, `"`, `<`, `>`, `|`, and null byte are not allowed in names.
        // This regex does not catch every possible invalid character but covers many common cases.
        const invalidCharsOrPattern = /[*?"<>|]|\/|\0/;
        return invalidCharsOrPattern.test(path);
    };

    // Check if the path is absolute or contains invalid characters
    if (path.isAbsolute(destinationFolderPath) || isInvalidPath(destinationFolderPath)) {
        console.error('Destination path is invalid or contains invalid characters.');
        return false;
    } else {
        return true;
    }
};


const writeOptimizeEntityToFile = async (optimizeEntityData: any, destinationFolderPath: string): Promise<void> => {
    try {

        const validatedDestinationPath = await isValidPath(destinationFolderPath)

        if (!validatedDestinationPath) {

            console.log('Invalid destination path.')
            process.exit(1)

        }

        const fileName = 'optimize-entities.json';
        const destinationFilePath = path.join(destinationFolderPath, `${fileName}`);

        if (!optimizeEntityData || optimizeEntityData.length === 0) {

            console.log('No Optimize artifacts found.')

        }

        if (!fs.existsSync(destinationFilePath)) {

            await fsPromises.mkdir(destinationFolderPath, {recursive: true});
        }

        // Convert optimizeEntityData to a JSON string
        const dataToWrite = JSON.stringify(optimizeEntityData, null, 2);
        await fsPromises.writeFile(destinationFilePath, dataToWrite);

        console.log(`File content saved to: ${destinationFilePath}`);


    } catch (error) {

        setFailed(error instanceof Error ? error.message : 'An error occurred');
    }
};

const runWorkflow = async () => {
    try {

        const dashboardIds = await getOptimizeDashboardIds();

        // Write only report definitions.
        if (!dashboardIds || dashboardIds.length === 0) {

            const reportIds = await getOptimizeReportIds()
            const reportDefinitions = await exportReportDefinitions(reportIds)

            await writeOptimizeEntityToFile(reportDefinitions, DESTINATION)

        } else {

            const reportIds = await getOptimizeReportIds()

            // Write only dashboard definitions.
            if (!reportIds || reportIds.length === 0) {

                const dashboardDefinitions = await exportDashboardDefinitions(dashboardIds);

                await writeOptimizeEntityToFile(dashboardDefinitions, DESTINATION);

            } else {

                // Write both reports and dashboards.
                const reportDefinitions = await exportReportDefinitions(reportIds)
                const dashboardDefinitions = await exportDashboardDefinitions(dashboardIds);
                const combinedDefinitions = reportDefinitions.concat(dashboardDefinitions);

                await writeOptimizeEntityToFile(combinedDefinitions, DESTINATION);

            }

        }

    } catch (error) {

        setFailed(error instanceof Error ? error.message : 'An error occurred');
    }

}

runWorkflow()
    .then(() => {
        console.log("Workflow completed successfully.");
    })
    .catch((error) => {

        setFailed(error instanceof Error ? error.message : 'An error occurred');
        process.exit(1)

    });