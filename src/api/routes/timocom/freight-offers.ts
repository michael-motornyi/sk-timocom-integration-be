import express, { type Request, type Response } from 'express';
import type { CreateFreightOfferRequest } from '../../../types/index.js';
import { getErrorMessage, handleRouteError } from '../../../utils/error-handler.js';
import { createTimocomClient, requireTimocomConfig } from './common.js';

const router = express.Router();

// Get all freight offers
router.get('/freight-offers', requireTimocomConfig, async (req: Request, res: Response) => {
  try {
    const client = createTimocomClient();
    const page = Number.parseInt(req.query.page as string, 10) || 1;
    const limit = Number.parseInt(req.query.limit as string, 10) || 50;
    const status = req.query.status as 'active' | 'inactive' | 'expired' | 'completed';

    const result = await client.getMyFreightOffers({ page, limit, status });

    res.json(result);
  } catch (error: unknown) {
    res
      .status(500)
      .json(handleRouteError(error, 'GET /freight-offers', 'Failed to fetch freight offers'));
  }
});

// Get specific freight offer by ID
router.get(
  '/freight-offers/:publicOfferId',
  requireTimocomConfig,
  async (req: Request, res: Response) => {
    try {
      const client = createTimocomClient();
      const { publicOfferId } = req.params;

      if (!publicOfferId) {
        return res.status(400).json({
          success: false,
          error: 'publicOfferId parameter is required',
        });
      }

      const result = await client.getFreightOffer(publicOfferId);

      res.json(result);
    } catch (error: unknown) {
      res
        .status(500)
        .json(handleRouteError(error, 'GET /freight-offers/:id', 'Failed to get freight offer'));
    }
  },
);

// Create new freight offer
router.post('/freight-offers', requireTimocomConfig, async (req: Request, res: Response) => {
  try {
    const client = createTimocomClient();
    const offerData = req.body;

    console.log(
      '🔍 Attempting to create freight offer with data:',
      JSON.stringify(offerData, null, 2),
    );

    const result = await client.createFreightOffer(offerData);

    console.log('✅ Successfully created freight offer:', result);
    res.status(201).json(result);
  } catch (error: unknown) {
    console.error('❌ Failed to create freight offer:', error);

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

    res
      .status(500)
      .json(handleRouteError(error, 'POST /freight-offers', 'Failed to create freight offer'));
  }
});

// Delete freight offer
router.delete(
  '/freight-offers/:publicOfferId',
  requireTimocomConfig,
  async (req: Request, res: Response) => {
    try {
      const client = createTimocomClient();
      const { publicOfferId } = req.params;

      if (!publicOfferId) {
        return res.status(400).json({
          success: false,
          error: 'publicOfferId parameter is required',
        });
      }

      const result = await client.deleteFreightOffer(publicOfferId);

      res.json(result);
    } catch (error: unknown) {
      res.status(500).json({
        success: false,
        error: getErrorMessage(error),
        timestamp: new Date().toISOString(),
      });
    }
  },
);

// Bulk create freight offers from generated data
// Features: Batch processing, automatic retry with 1-second delay, concurrent execution
router.post('/freight-offers/bulk', requireTimocomConfig, async (req: Request, res: Response) => {
  try {
    const client = createTimocomClient();
    const { offers, maxConcurrent = 5 } = req.body;

    if (!Array.isArray(offers) || offers.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Offers array is required and must not be empty',
      });
    }

    console.log(`🚛 Starting bulk creation of ${offers.length} freight offers...`);

    const results: Array<{ index: number; success: boolean; data?: unknown; error?: string }> = [];
    const failed: Array<{ index: number; error: string }> = [];
    let processed = 0;

    // Process offers in batches to avoid overwhelming the API
    for (let i = 0; i < offers.length; i += maxConcurrent) {
      const batch = offers.slice(i, i + maxConcurrent);
      const batchPromises = batch.map(async (offer: unknown, index: number) => {
        const actualIndex = i + index;

        // First attempt
        try {
          const result = await client.createFreightOffer(offer as CreateFreightOfferRequest);
          processed++;
          console.log(`✅ Created offer ${processed}/${offers.length}`);
          return { index: actualIndex, success: true, data: result.data };
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          console.log(
            `⚠️ First attempt failed for offer ${actualIndex}: ${errorMessage}. Retrying in 1 second...`,
          );

          // Wait 1 second before retry
          await new Promise((resolve) => setTimeout(resolve, 1000));

          // Retry attempt
          try {
            const result = await client.createFreightOffer(offer as CreateFreightOfferRequest);
            processed++;
            console.log(`✅ Retry successful for offer ${processed}/${offers.length}`);
            return { index: actualIndex, success: true, data: result.data };
          } catch (retryError: unknown) {
            const retryErrorMessage = getErrorMessage(retryError);
            failed.push({
              index: actualIndex,
              error: `Initial: ${errorMessage}, Retry: ${retryErrorMessage}`,
            });
            console.log(`❌ Both attempts failed for offer ${actualIndex}: ${retryErrorMessage}`);
            return { index: actualIndex, success: false, error: retryErrorMessage };
          }
        }
      });

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Small delay between batches to be respectful to the API
      if (i + maxConcurrent < offers.length) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    res.json({
      success: true,
      message: `Bulk operation completed: ${results.filter((r) => r.success).length} created, ${failed.length} failed`,
      results: {
        total: offers.length,
        created: results.filter((r) => r.success).length,
        failed: failed.length,
        createdOffers: results.filter((r) => r.success).map((r) => r.data),
        failures: failed,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: getErrorMessage(error),
      timestamp: new Date().toISOString(),
    });
  }
});

// Delete all freight offers (POST version - more reliable)
router.post(
  '/freight-offers/delete-all',
  requireTimocomConfig,
  async (req: Request, res: Response) => {
    try {
      const client = createTimocomClient();
      const { confirm } = req.body;

      // Safety check - require explicit confirmation in request body
      if (confirm !== true) {
        return res.status(400).json({
          success: false,
          error:
            'This operation requires confirmation. Set "confirm": true in the request body to proceed.',
          warning: 'This will delete ALL freight offers and cannot be undone.',
          example: { confirm: true },
        });
      }

      console.log('🗑️ Starting deletion of all freight offers...');

      // Get all freight offers first
      const allOffersResult = await client.getMyFreightOffers({ limit: 1000 });
      const rawData = allOffersResult.data as {
        payload?: Array<{ id: string; [key: string]: unknown }>;
      };
      const offers = rawData?.payload || [];

      if (offers.length === 0) {
        return res.json({
          success: true,
          message: 'No freight offers found to delete',
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
          await client.deleteFreightOffer(offerId);
          results.push({ offerId, success: true });
          deleted++;
          console.log(`✅ Deleted freight offer ${deleted}/${offers.length}: ${offerId}`);

          // Small delay between deletions
          if (deleted < offers.length) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          failed.push({ offerId, error: errorMessage });
          results.push({ offerId, success: false, error: errorMessage });
          console.log(`❌ Failed to delete freight offer ${offerId}: ${errorMessage}`);
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
            'POST /freight-offers/delete-all',
            'Failed to delete all freight offers',
          ),
        );
    }
  },
);

export default router;
