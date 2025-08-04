// Importing the axios library for making HTTP requests
import axios from 'axios';
// Importing types and constants from the Raydium SDK
import { ApiV3Token } from '@raydium-io/raydium-sdk-v2';
import { ConfigInfo } from './type';
import { CONFIG_LIST_URL } from './url';

/**
 * Fetches the configuration list from the API and logs the data.
 * The data includes configuration information and mint details.
 */
async function configListApi() {
  // Making a GET request to fetch configuration data
  const r = await axios.get<{
    id: string;
    success: boolean;
    msg?: string;
    data: {
      data: { key: ConfigInfo; mintInfoB: ApiV3Token }[];
    };
  }>(CONFIG_LIST_URL);

  // Logging the fetched configuration and mint information
  console.log(
    r.data.data.data.map((d) => ({
      configInfo: d.key,
      mintBInfo: d.mintInfoB,
    }))
  );

  // Exiting the process after logging the data
  process.exit();
}

// Execute the function to fetch and log configuration data
configListApi();
