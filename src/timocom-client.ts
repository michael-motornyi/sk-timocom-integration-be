import axios, { type AxiosInstance } from 'axios';
import type {
  CreateFreightOfferRequest,
  PublishVehicleSpaceOfferRequest,
  TimocomApiResponse,
  TimocomConfig,
  TimocomFreightOffer,
  TimocomFreightOffersList,
} from './types/index.js';

// Define TimocomClientContext type
interface TimocomClientContext {
  client: AxiosInstance;
  config: Required<TimocomConfig>;
  credentials: {
    username: string;
    password: string;
    companyId: string;
  };
}

// ============================================================================
// CONFIGURATION AND SETUP
// ============================================================================

/**
 * Default TIMOCOM API configuration
 */
const DEFAULT_CONFIG: Required<TimocomConfig> = {
  baseUrl: 'https://www.timocom.com/api',
  timeout: 15000,
  environment: 'production',
  username: '',
  password: '',
  companyId: '',
  apiKey: '',
};

/**
 * Environment-specific base URLs
 */
const ENVIRONMENT_URLS = {
  production: 'https://api.timocom.com',
  sandbox: 'https://sandbox.timocom.com',
} as const;

/**
 * Get base URL for the specified environment
 */
function getBaseUrl(environment: TimocomConfig['environment'] = 'production'): string {
  const envFromConfig = process.env.TIMOCOM_ENV as keyof typeof ENVIRONMENT_URLS;
  const finalEnv = envFromConfig || environment || 'production';
  return ENVIRONMENT_URLS[finalEnv] || ENVIRONMENT_URLS.production;
}

/**
 * Load configuration from environment variables
 */
function loadConfigFromEnv(): TimocomConfig {
  return {
    username: process.env.TIMOCOM_USERNAME || '',
    password: process.env.TIMOCOM_PASSWORD || '',
    companyId: process.env.TIMOCOM_ID || '',
    timeout: process.env.TIMOCOM_TIMEOUT_MS
      ? Number.parseInt(process.env.TIMOCOM_TIMEOUT_MS, 10)
      : 15000,
    environment: (process.env.TIMOCOM_ENV as TimocomConfig['environment']) || 'production',
    baseUrl: getBaseUrl((process.env.TIMOCOM_ENV as TimocomConfig['environment']) || 'production'),
  };
}

/**
 * Create TIMOCOM client context with configuration and HTTP client
 */
function createTimocomClient(config: TimocomConfig = {}): TimocomClientContext {
  const envConfig = loadConfigFromEnv();
  const mergedConfig = { ...DEFAULT_CONFIG, ...envConfig, ...config };

  // Validate required credentials
  if (!mergedConfig.username || !mergedConfig.password || !mergedConfig.companyId) {
    throw new Error(
      'Missing required TIMOCOM credentials. Please provide username, password, and companyId via config or environment variables (TIMOCOM_USERNAME, TIMOCOM_PASSWORD, TIMOCOM_ID)',
    );
  }

  const credentials = {
    username: mergedConfig.username,
    password: mergedConfig.password,
    companyId: mergedConfig.companyId,
  };

  const client = axios.create({
    baseURL: getBaseUrl(mergedConfig.environment),
    timeout: mergedConfig.timeout,
    auth: {
      username: credentials.username,
      password: credentials.password,
    },
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      'User-Agent': 'TIMOCOM-SDK/1.0.0',
    },
  });

  // Add request interceptor for logging
  client.interceptors.request.use((request) => {
    console.log(`🌐 TIMOCOM API Request: ${request.method?.toUpperCase()} ${request.url}`);
    return request;
  });

  // Add response interceptor for logging
  client.interceptors.response.use(
    (response) => {
      console.log(`✅ TIMOCOM API Response: ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      const status = error.response?.status || 'Unknown';
      const message = error.response?.data || error.message;
      console.log(`❌ TIMOCOM API Response Error: ${status} ${message}`);
      return Promise.reject(error);
    },
  );

  return {
    client,
    config: mergedConfig,
    credentials,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create URL parameters with company ID for TIMOCOM API requests
 */
function createUrlParams(
  credentials: TimocomClientContext['credentials'],
  params: Record<string, string | number | boolean | undefined> = {},
): URLSearchParams {
  const urlParams = new URLSearchParams();
  urlParams.append('timocom_id', credentials.companyId);

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      urlParams.append(key, value.toString());
    }
  });

  return urlParams;
}

// ============================================================================
// API FUNCTIONS
// ============================================================================

/**
 * Get all freight offers for the authenticated user
 */
async function getMyFreightOffers(
  context: TimocomClientContext,
): Promise<TimocomApiResponse<TimocomFreightOffersList>> {
  try {
    const params = createUrlParams(context.credentials);

    const response = await context.client.get(`/freight-exchange/3/my-freight-offers?${params}`);

    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`TIMOCOM API Error: ${(error as Error).message}`);
  }
}

/**
 * Get a specific freight offer by public offer ID
 */
async function getFreightOffer(
  context: TimocomClientContext,
  publicOfferId: string,
): Promise<TimocomApiResponse<TimocomFreightOffer>> {
  try {
    const params = createUrlParams(context.credentials);
    const response = await context.client.get(
      `/freight-exchange/3/freight-offers/${publicOfferId}?${params}`,
    );

    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`TIMOCOM API Error: ${(error as Error).message}`);
  }
}

/**
 * Create a new freight offer
 */
async function createFreightOffer(
  context: TimocomClientContext,
  offer: CreateFreightOfferRequest,
): Promise<TimocomApiResponse<TimocomFreightOffer>> {
  try {
    const params = createUrlParams(context.credentials);
    console.log(
      '🚚 Creating freight offer with URL:',
      `/freight-exchange/3/my-freight-offers?${params}`,
    );
    console.log('🚚 Payload:', JSON.stringify(offer, null, 2), params);

    const response = await context.client.post('/freight-exchange/3/my-freight-offers', offer, {
      params,
    });

    console.log('✅ TIMOCOM API Response:', response.data);
    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error('❌ TIMOCOM createFreightOffer error:', error);

    // Enhanced error handling for axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: {
          status?: number;
          statusText?: string;
          data?: unknown;
        };
        config?: {
          url?: string;
          method?: string;
        };
      };

      if (axiosError.response) {
        console.error('📡 Full TIMOCOM API Error Response:', {
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          data: axiosError.response.data,
          url: axiosError.config?.url,
        });

        throw new Error(
          `TIMOCOM API ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`,
        );
      }
    }

    throw new Error(`TIMOCOM API Error: ${(error as Error).message}`);
  }
}

/**
 * Delete a freight offer
 */
async function deleteFreightOffer(
  context: TimocomClientContext,
  publicOfferId: string,
): Promise<TimocomApiResponse<void>> {
  try {
    const params = createUrlParams(context.credentials);
    await context.client.delete(`/freight-exchange/3/my-freight-offers/${publicOfferId}?${params}`);

    return {
      success: true,
      data: undefined,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`TIMOCOM API Error: ${(error as Error).message}`);
  }
}

// ============================================================================
// VEHICLE SPACE OFFER FUNCTIONS
// ============================================================================

/**
 * Get my vehicle space offers
 */
async function getMyVehicleSpaceOffers(
  context: TimocomClientContext,
): Promise<TimocomApiResponse<unknown[]>> {
  try {
    const queryParams = createUrlParams(context.credentials);

    const response = await context.client.get(
      `/freight-exchange/3/my-vehicle-space-offers?${queryParams}`,
    );
    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`TIMOCOM API Error: ${(error as Error).message}`);
  }
}

/**
 * Get a specific vehicle space offer by public offer ID
 */
async function getVehicleSpaceOffer(
  context: TimocomClientContext,
  publicOfferId: string,
): Promise<TimocomApiResponse<unknown>> {
  try {
    const params = createUrlParams(context.credentials);
    const response = await context.client.get(
      `/freight-exchange/3/my-vehicle-space-offers/${publicOfferId}?${params}`,
    );

    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`TIMOCOM API Error: ${(error as Error).message}`);
  }
}

/**
 * Create a new vehicle space offer
 */
async function createVehicleSpaceOffer(
  context: TimocomClientContext,
  offer: PublishVehicleSpaceOfferRequest,
): Promise<TimocomApiResponse<unknown>> {
  try {
    const params = createUrlParams(context.credentials);
    console.log(
      '🚛 Creating vehicle space offer with URL:',
      `/freight-exchange/3/my-vehicle-space-offers?${params}`,
    );
    console.log('🚛 Payload:', JSON.stringify(offer, null, 2));

    const response = await context.client.post(
      '/freight-exchange/3/my-vehicle-space-offers',
      offer,
      {
        params,
      },
    );

    console.log('✅ TIMOCOM API Response:', response.data);
    return {
      success: true,
      data: response.data,
      timestamp: new Date().toISOString(),
    };
  } catch (error: unknown) {
    console.error('❌ TIMOCOM createVehicleSpaceOffer error:', error);

    // Enhanced error handling for axios errors
    if (error && typeof error === 'object' && 'response' in error) {
      const axiosError = error as {
        response?: {
          status?: number;
          statusText?: string;
          data?: unknown;
        };
        config?: {
          url?: string;
          method?: string;
        };
      };

      if (axiosError.response) {
        console.error('📡 Full TIMOCOM API Error Response:', {
          status: axiosError.response.status,
          statusText: axiosError.response.statusText,
          data: axiosError.response.data,
          url: axiosError.config?.url,
        });

        throw new Error(
          `TIMOCOM API ${axiosError.response.status}: ${JSON.stringify(axiosError.response.data)}`,
        );
      }
    }

    throw new Error(`TIMOCOM API Error: ${(error as Error).message}`);
  }
}

/**
 * Delete a vehicle space offer
 */
async function deleteVehicleSpaceOffer(
  context: TimocomClientContext,
  publicOfferId: string,
): Promise<TimocomApiResponse<void>> {
  try {
    const params = createUrlParams(context.credentials);
    await context.client.delete(
      `/freight-exchange/3/my-vehicle-space-offers/${publicOfferId}?${params}`,
    );

    return {
      success: true,
      data: undefined,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw new Error(`TIMOCOM API Error: ${(error as Error).message}`);
  }
}

// ============================================================================
// TEST CONNECTION FUNCTION
// ============================================================================

/**
 * Test TIMOCOM API connection
 */
async function testConnection(context: TimocomClientContext): Promise<TimocomApiResponse<void>> {
  try {
    // Use a simple API call to test connection
    await getMyFreightOffers(context);
    return {
      success: true,
      message: 'TIMOCOM API connection successful',
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message,
      timestamp: new Date().toISOString(),
    };
  }
}

// ============================================================================
// CONVENIENCE API - HIGHER-ORDER FUNCTIONS
// ============================================================================

/**
 * Create a TIMOCOM API client with pre-configured context
 * Returns an object with all API methods bound to the context
 */
function createTimocomApi(config: TimocomConfig = {}) {
  const context = createTimocomClient(config);

  return {
    // Context and configuration
    context,
    config: context.config,
    credentials: context.credentials,

    // Core API methods
    getMyFreightOffers: () => getMyFreightOffers(context),

    getFreightOffer: (publicOfferId: string) => getFreightOffer(context, publicOfferId),

    createFreightOffer: (offer: CreateFreightOfferRequest) => createFreightOffer(context, offer),

    deleteFreightOffer: (publicOfferId: string) => deleteFreightOffer(context, publicOfferId),

    // Vehicle space offer methods
    getMyVehicleSpaceOffers: () => getMyVehicleSpaceOffers(context),

    getVehicleSpaceOffer: (publicOfferId: string) => getVehicleSpaceOffer(context, publicOfferId),

    createVehicleSpaceOffer: (offer: PublishVehicleSpaceOfferRequest) =>
      createVehicleSpaceOffer(context, offer),

    deleteVehicleSpaceOffer: (publicOfferId: string) =>
      deleteVehicleSpaceOffer(context, publicOfferId),

    // Utility methods
    testConnection: () => testConnection(context),
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export {
  // Core functions
  createTimocomClient,
  createTimocomApi,
  // Freight offer functions
  getMyFreightOffers,
  getFreightOffer,
  createFreightOffer,
  deleteFreightOffer,
  // Vehicle space offer functions
  getMyVehicleSpaceOffers,
  getVehicleSpaceOffer,
  createVehicleSpaceOffer,
  deleteVehicleSpaceOffer,
  // Utility functions
  testConnection,
  createUrlParams,
  getBaseUrl,
  loadConfigFromEnv,
  // Types
  type TimocomClientContext,
};

export default createTimocomApi;
