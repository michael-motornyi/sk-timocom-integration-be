import express, { type Request, type Response } from 'express';
import { getErrorMessage, handleRouteError } from '../../../utils/error-handler.js';
import { createTimocomClient, requireTimocomConfig } from './common.js';

const router = express.Router();

// Get all vehicle space offers
router.get('/vehicle-space-offers', requireTimocomConfig, async (req: Request, res: Response) => {
  try {
    const client = createTimocomClient();
    const page = Number.parseInt(req.query.page as string, 10) || 1;
    const limit = Number.parseInt(req.query.limit as string, 10) || 50;
    const status = req.query.status as 'active' | 'inactive' | 'expired' | 'completed';

    const result = await client.getMyVehicleSpaceOffers({ page, limit, status });

    res.json(result);
  } catch (error: unknown) {
    res
      .status(500)
      .json(
        handleRouteError(
          error,
          'GET /vehicle-space-offers',
          'Failed to fetch vehicle space offers',
        ),
      );
  }
});

// Get specific vehicle space offer by ID
router.get(
  '/vehicle-space-offers/:publicOfferId',
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

      const result = await client.getVehicleSpaceOffer(publicOfferId);

      res.json(result);
    } catch (error: unknown) {
      res
        .status(500)
        .json(
          handleRouteError(
            error,
            'GET /vehicle-space-offers/:id',
            'Failed to get vehicle space offer',
          ),
        );
    }
  },
);

// Create new vehicle space offer
router.post('/vehicle-space-offers', requireTimocomConfig, async (req: Request, res: Response) => {
  try {
    const client = createTimocomClient();
    const offerData = req.body;

    console.log(
      '🔍 Attempting to create vehicle space offer with data:',
      JSON.stringify(offerData, null, 2),
    );

    const result = await client.createVehicleSpaceOffer(offerData);

    console.log('✅ Successfully created vehicle space offer:', result);
    res.status(201).json(result);
  } catch (error: unknown) {
    console.error('❌ Failed to create vehicle space offer:', error);

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
      .json(
        handleRouteError(
          error,
          'POST /vehicle-space-offers',
          'Failed to create vehicle space offer',
        ),
      );
  }
});

// Delete vehicle space offer
router.delete(
  '/vehicle-space-offers/:publicOfferId',
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

      const result = await client.deleteVehicleSpaceOffer(publicOfferId);

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

// Delete all vehicle space offers (POST version - more reliable)
router.post(
  '/vehicle-space-offers/delete-all',
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
          warning: 'This will delete ALL vehicle space offers and cannot be undone.',
          example: { confirm: true },
        });
      }

      console.log('🗑️ Starting deletion of all vehicle space offers...');

      // Get all vehicle space offers first
      const allOffersResult = await client.getMyVehicleSpaceOffers({ limit: 1000 });
      const rawData = allOffersResult.data as {
        payload?: Array<{ id: string; [key: string]: unknown }>;
      };
      const offers = rawData?.payload || [];

      if (offers.length === 0) {
        return res.json({
          success: true,
          message: 'No vehicle space offers found to delete',
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
          await client.deleteVehicleSpaceOffer(offerId);
          results.push({ offerId, success: true });
          deleted++;
          console.log(`✅ Deleted vehicle space offer ${deleted}/${offers.length}: ${offerId}`);

          // Small delay between deletions
          if (deleted < offers.length) {
            await new Promise((resolve) => setTimeout(resolve, 500));
          }
        } catch (error: unknown) {
          const errorMessage = getErrorMessage(error);
          failed.push({ offerId, error: errorMessage });
          results.push({ offerId, success: false, error: errorMessage });
          console.log(`❌ Failed to delete vehicle space offer ${offerId}: ${errorMessage}`);
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
            'POST /vehicle-space-offers/delete-all',
            'Failed to delete all vehicle space offers',
          ),
        );
    }
  },
);

export default router;
