import type { Request, Response } from 'express';
import { getErrorMessage, handleRouteError } from '../../../utils/error-handler.js';
import { createTimocomClient } from './common.js';

interface DeleteAllOptions {
  routeName: string;
  resourceName: string;
  pluralResourceName: string;
  emoji: string;
}

/**
 * Generic GET handler for retrieving all offers
 */
export function createGetAllHandler(
  methodName: 'getMyFreightOffers' | 'getMyVehicleSpaceOffers',
  routeName: string,
  errorMessage: string,
) {
  return async (_req: Request, res: Response) => {
    try {
      const client = createTimocomClient();
      const result = await client[methodName]();
      res.json(result);
    } catch (error: unknown) {
      res.status(500).json(handleRouteError(error, routeName, errorMessage));
    }
  };
}

/**
 * Generic GET by ID handler
 */
export function createGetByIdHandler(
  methodName: 'getFreightOffer' | 'getVehicleSpaceOffer',
  routeName: string,
  errorMessage: string,
) {
  return async (req: Request, res: Response) => {
    try {
      const client = createTimocomClient();
      const { publicOfferId } = req.params;

      if (!publicOfferId) {
        return res.status(400).json({
          success: false,
          error: 'publicOfferId parameter is required',
        });
      }

      const result = await client[methodName](publicOfferId);
      res.json(result);
    } catch (error: unknown) {
      res.status(500).json(handleRouteError(error, routeName, errorMessage));
    }
  };
}

/**
 * Enhanced error handler for API responses
 */
function handleApiError(error: unknown, res: Response, routeName: string, fallbackMessage: string) {
  console.error(`❌ ${fallbackMessage}:`, error);

  // Enhanced error reporting for debugging
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
      console.error('📡 TIMOCOM API Response:', {
        status: axiosError.response.status,
        statusText: axiosError.response.statusText,
        data: axiosError.response.data,
        url: axiosError.config?.url,
        method: axiosError.config?.method,
      });

      return res.status(400).json({
        success: false,
        error: `TIMOCOM API Error: ${axiosError.response.status} ${axiosError.response.statusText}`,
        details: axiosError.response.data,
        timestamp: new Date().toISOString(),
      });
    }
  }

  res.status(500).json(handleRouteError(error, routeName, fallbackMessage));
}

/**
 * Generic CREATE handler
 */
export function createPostHandler(
  methodName: 'createFreightOffer' | 'createVehicleSpaceOffer',
  routeName: string,
  resourceName: string,
) {
  return async (req: Request, res: Response) => {
    try {
      const client = createTimocomClient();
      const offerData = req.body;

      console.log(
        `🔍 Attempting to create ${resourceName} with data:`,
        JSON.stringify(offerData, null, 2),
      );

      const result = await client[methodName](offerData);

      console.log(`✅ Successfully created ${resourceName}:`, result);
      res.status(201).json(result);
    } catch (error: unknown) {
      handleApiError(error, res, routeName, `Failed to create ${resourceName}`);
    }
  };
}

/**
 * Generic DELETE handler
 */
export function createDeleteHandler(methodName: 'deleteFreightOffer' | 'deleteVehicleSpaceOffer') {
  return async (req: Request, res: Response) => {
    try {
      const client = createTimocomClient();
      const { publicOfferId } = req.params;

      if (!publicOfferId) {
        return res.status(400).json({
          success: false,
          error: 'publicOfferId parameter is required',
        });
      }

      const result = await client[methodName](publicOfferId);
      res.json(result);
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: getErrorMessage(error),
        timestamp: new Date().toISOString(),
      });
    }
  };
}

/**
 * Generic DELETE ALL handler
 */
export function createDeleteAllHandler(
  getAllMethodName: 'getMyFreightOffers' | 'getMyVehicleSpaceOffers',
  deleteMethodName: 'deleteFreightOffer' | 'deleteVehicleSpaceOffer',
  options: DeleteAllOptions,
) {
  return async (req: Request, res: Response) => {
    try {
      const client = createTimocomClient();
      const { confirm } = req.body;

      // Safety check - require explicit confirmation in request body
      if (confirm !== true) {
        return res.status(400).json({
          success: false,
          error:
            'This operation requires confirmation. Set "confirm": true in the request body to proceed.',
          warning: `This will delete ALL ${options.pluralResourceName} and cannot be undone.`,
          example: { confirm: true },
        });
      }

      console.log(`🗑️ Starting deletion of all ${options.pluralResourceName}...`);

      // Get all offers first
      const allOffersResult = await client[getAllMethodName]();
      const rawData = (
        allOffersResult as { data: { payload?: Array<{ id: string; [key: string]: unknown }> } }
      ).data;
      const offers = rawData?.payload || [];

      if (offers.length === 0) {
        return res.json({
          success: true,
          message: `No ${options.pluralResourceName} found to delete`,
          results: {
            total: 0,
            deleted: 0,
            failed: 0,
          },
          timestamp: new Date().toISOString(),
        });
      }

      const results: Array<{ offerId: string; success: boolean; error?: string }> = [];
      const failed: Array<{ offerId: string; error: string }> = [];
      let deleted = 0;

      // Delete offers with a delay to be respectful to the API
      for (const offer of offers) {
        const offerId = (offer.id as string) || (offer.publicOfferId as string);
        if (!offerId) {
          console.log('⚠️ Skipping offer without id or publicOfferId');
          continue;
        }

        try {
          await client[deleteMethodName](offerId);
          results.push({ offerId, success: true });
          deleted++;
          console.log(`✅ Deleted ${options.resourceName} ${deleted}/${offers.length}: ${offerId}`);

          // Small delay between deletions
          if (deleted < offers.length) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          failed.push({ offerId, error: errorMessage });
          results.push({ offerId, success: false, error: errorMessage });
          console.log(`❌ Failed to delete ${options.resourceName} ${offerId}: ${errorMessage}`);
        }
      }

      res.json({
        success: true,
        message: `Delete all operation completed: ${deleted} deleted, ${failed.length} failed`,
        results: {
          total: offers.length,
          deleted,
          failed: failed.length,
          deletedOffers: results.filter((r) => r.success).map((r) => r.offerId),
          failures: failed,
        },
        timestamp: new Date().toISOString(),
      });
    } catch (error: unknown) {
      res
        .status(500)
        .json(
          handleRouteError(
            error,
            options.routeName,
            `Failed to delete all ${options.pluralResourceName}`,
          ),
        );
    }
  };
}
