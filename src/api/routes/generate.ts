import express, { type Request, type Response } from 'express';
import type { CreateFreightOfferRequest, PublishVehicleSpaceOfferRequest } from '../../types/index.js';
import { generateFreightOffers } from '../../scripts/generate-freight-offers.js';
import { generateVehicleSpaceOffers } from '../../scripts/generate-vehicle-space-offers.js';
import { getErrorMessage, handleRouteError } from '../../utils/error-handler.js';
import { createTimocomClient } from './timocom/common.js';

const router = express.Router();

/**
 * GENERATION API WITH AUTOMATIC TIMOCOM BULK POSTING
 *
 * All generation endpoints now support automatic bulk posting to TIMOCOM:
 *
 * ENDPOINTS:
 * - POST /generate/freight - Generate freight offers
 * - POST /generate/vehicle-space - Generate vehicle space offers
 * - POST /generate/all - Generate both types
 *
 * PARAMETERS:
 * - count: Number of offers to generate (1-10000, default: 1000)
 * - autoPost: Whether to auto-post to TIMOCOM (default: true)
 * - maxConcurrent: Concurrent requests for bulk posting (default: 10)
 *
 * BULK POSTING BEHAVIOR:
 * - Uses TIMOCOM client directly for bulk creation
 * - Processes offers in concurrent batches for better performance
 * - Includes automatic retry with 1-second delay for failed attempts
 * - Returns detailed results including success/failure counts
 * - Gracefully handles TIMOCOM API errors without failing generation
 *
 * RESPONSE STRUCTURE:
 * - success: boolean
 * - message: Status message with counts
 * - count: Number of offers generated
 * - autoPost: Boolean indicating if posting was attempted
 * - timocomResults: Bulk posting results (when autoPost=true)
 *   - total: Total offers attempted to post
 *   - created: Successfully posted offers
 *   - failed: Failed posting attempts
 * - data: Generated offer data
 */

// Generate freight offers endpoint
router.post('/freight', async (req: Request, res: Response) => {
  try {
    const count = req.body?.count || req.query?.count || 1000;
    const autoPost = req.body?.autoPost !== false && req.query?.autoPost !== 'false'; // Default true
    const numCount = Number.parseInt(count, 10);

    if (Number.isNaN(numCount) || numCount <= 0 || numCount > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid count. Must be a positive number between 1 and 10000.',
      });
    }

    console.log(`🚚 API: Starting freight offers generation (${numCount} items)...`);

    // Generate the offers
    const freightOffers = await generateFreightOffers(numCount);
    const dataSize = JSON.stringify(freightOffers).length;

    let timocomResults: {
      total: number;
      created: number;
      failed: number;
      results?: unknown;
    } | null = null;

    // Automatically post to TIMOCOM if enabled
    if (autoPost) {
      console.log(`📤 API: Bulk posting ${numCount} freight offers to TIMOCOM...`);

      try {
        const client = createTimocomClient();
        const maxConcurrent = 5;

        const results: Array<{ index: number; success: boolean; data?: unknown; error?: string }> = [];
        const failed: Array<{ index: number; error: string }> = [];
        let processed = 0;

        // Process offers in batches to avoid overwhelming the API
        for (let i = 0; i < freightOffers.length; i += maxConcurrent) {
          const batch = freightOffers.slice(i, i + maxConcurrent);
          const batchPromises = batch.map(async (offer: unknown, index: number) => {
            const actualIndex = i + index;

            // First attempt
            try {
              const result = await client.createFreightOffer(offer as CreateFreightOfferRequest);
              processed++;
              console.log(`✅ Created offer ${processed}/${freightOffers.length}`);
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
                console.log(`✅ Retry successful for offer ${processed}/${freightOffers.length}`);
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
          if (i + maxConcurrent < freightOffers.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        timocomResults = {
          total: freightOffers.length,
          created: results.filter((r) => r.success).length,
          failed: failed.length,
          results: {
            total: freightOffers.length,
            created: results.filter((r) => r.success).length,
            failed: failed.length,
            createdOffers: results.filter((r) => r.success).map((r) => r.data),
            failures: failed,
          },
        };

        console.log(
          `✅ TIMOCOM bulk posting completed: ${timocomResults.created} successful, ${timocomResults.failed} failed`,
        );
      } catch (bulkError: unknown) {
        console.error('❌ TIMOCOM bulk posting error:', bulkError);
        timocomResults = { total: numCount, created: 0, failed: numCount };
      }
    }

    res.json({
      success: true,
      message: autoPost
        ? `Freight offers generated and posted to TIMOCOM (${numCount} generated, ${timocomResults?.created || 0} posted successfully, ${timocomResults?.failed || 0} failed)`
        : `Freight offers generated successfully (${numCount} records)`,
      count: numCount,
      dataSize: dataSize,
      dataSizeFormatted: `${(dataSize / 1024 / 1024).toFixed(2)} MB`,
      generated: new Date().toISOString(),
      autoPost: autoPost,
      timocomResults: timocomResults,
      data: freightOffers,
    });
  } catch (error: unknown) {
    res
      .status(500)
      .json(handleRouteError(error, 'POST /generate/freight', 'Failed to generate freight offers'));
  }
});

// Generate vehicle space offers endpoint
router.post('/vehicle-space', async (req: Request, res: Response) => {
  try {
    const count = req.body?.count || req.query?.count || 1000;
    const autoPost = req.body?.autoPost !== false && req.query?.autoPost !== 'false'; // Default true
    const numCount = Number.parseInt(count, 10);

    if (Number.isNaN(numCount) || numCount <= 0 || numCount > 10000) {
      return res.status(400).json({
        success: false,
        error: 'Invalid count. Must be a positive number between 1 and 10000.',
      });
    }

    console.log(`🚛 API: Starting vehicle space offers generation (${numCount} items)...`);

    // Generate the offers
    const vehicleSpaceOffers = await generateVehicleSpaceOffers(numCount);
    const dataSize = JSON.stringify(vehicleSpaceOffers).length;

    let timocomResults: {
      total: number;
      created: number;
      failed: number;
      results?: unknown;
    } | null = null;

    // Automatically post to TIMOCOM if enabled
    if (autoPost) {
      console.log(`📤 API: Bulk posting ${numCount} vehicle space offers to TIMOCOM...`);

      try {
        const client = createTimocomClient();
        const maxConcurrent = 5;

        const results: Array<{ index: number; success: boolean; data?: unknown; error?: string }> = [];
        const failed: Array<{ index: number; error: string }> = [];
        let processed = 0;

        // Process offers in batches to avoid overwhelming the API
        for (let i = 0; i < vehicleSpaceOffers.length; i += maxConcurrent) {
          const batch = vehicleSpaceOffers.slice(i, i + maxConcurrent);
          const batchPromises = batch.map(async (offer: unknown, index: number) => {
            const actualIndex = i + index;

            // First attempt
            try {
              const result = await client.createVehicleSpaceOffer(offer as PublishVehicleSpaceOfferRequest);
              processed++;
              console.log(`✅ Created offer ${processed}/${vehicleSpaceOffers.length}`);
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
                const result = await client.createVehicleSpaceOffer(offer as PublishVehicleSpaceOfferRequest);
                processed++;
                console.log(`✅ Retry successful for offer ${processed}/${vehicleSpaceOffers.length}`);
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
          if (i + maxConcurrent < vehicleSpaceOffers.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        timocomResults = {
          total: vehicleSpaceOffers.length,
          created: results.filter((r) => r.success).length,
          failed: failed.length,
          results: {
            total: vehicleSpaceOffers.length,
            created: results.filter((r) => r.success).length,
            failed: failed.length,
            createdOffers: results.filter((r) => r.success).map((r) => r.data),
            failures: failed,
          },
        };

        console.log(
          `✅ TIMOCOM bulk posting completed: ${timocomResults.created} successful, ${timocomResults.failed} failed`,
        );
      } catch (bulkError: unknown) {
        console.error('❌ TIMOCOM bulk posting error:', bulkError);
        timocomResults = { total: numCount, created: 0, failed: numCount };
      }
    }

    res.json({
      success: true,
      message: autoPost
        ? `Vehicle space offers generated and posted to TIMOCOM (${numCount} generated, ${timocomResults?.created || 0} posted successfully, ${timocomResults?.failed || 0} failed)`
        : `Vehicle space offers generated successfully (${numCount} records)`,
      count: numCount,
      dataSize: dataSize,
      dataSizeFormatted: `${(dataSize / 1024 / 1024).toFixed(2)} MB`,
      generated: new Date().toISOString(),
      autoPost: autoPost,
      timocomResults: timocomResults,
      data: vehicleSpaceOffers,
    });
  } catch (error: unknown) {
    res
      .status(500)
      .json(
        handleRouteError(
          error,
          'POST /generate/vehicle-space',
          'Failed to generate vehicle space offers',
        ),
      );
  }
});

// Generate all endpoint
router.post('/all', async (req: Request, res: Response) => {
  try {
    const freightCount = req.body?.freightCount || req.query?.freightCount || 1000;
    const vehicleCount = req.body?.vehicleCount || req.query?.vehicleCount || 1000;
    const autoPost = req.body?.autoPost !== false && req.query?.autoPost !== 'false'; // Default true
    const numFreightCount = Number.parseInt(freightCount, 10);
    const numVehicleCount = Number.parseInt(vehicleCount, 10);

    if (
      Number.isNaN(numFreightCount) ||
      numFreightCount <= 0 ||
      numFreightCount > 10000 ||
      Number.isNaN(numVehicleCount) ||
      numVehicleCount <= 0 ||
      numVehicleCount > 10000
    ) {
      return res.status(400).json({
        success: false,
        error: 'Invalid counts. Must be positive numbers between 1 and 10000.',
      });
    }

    console.log(
      `🔄 API: Starting generation of all offer types (${numFreightCount} freight, ${numVehicleCount} vehicle)...`,
    );

    // Generate freight offers
    console.log(`🚚 Generating ${numFreightCount} freight offers...`);
    const freightOffers = await generateFreightOffers(numFreightCount);

    // Generate vehicle space offers
    console.log(`🚛 Generating ${numVehicleCount} vehicle space offers...`);
    const vehicleSpaceOffers = await generateVehicleSpaceOffers(numVehicleCount);

    const freightDataSize = JSON.stringify(freightOffers).length;
    const vehicleDataSize = JSON.stringify(vehicleSpaceOffers).length;

    let freightTimocomResults: {
      total: number;
      created: number;
      failed: number;
      results?: unknown;
    } | null = null;
    let vehicleTimocomResults: {
      total: number;
      created: number;
      failed: number;
      results?: unknown;
    } | null = null;

    // Automatically post to TIMOCOM if enabled
    if (autoPost) {
      console.log(
        `📤 API: Bulk posting offers to TIMOCOM (${numFreightCount} freight, ${numVehicleCount} vehicle)...`,
      );

      // Post freight offers to TIMOCOM using direct bulk creation
      console.log(`📤 Bulk posting ${numFreightCount} freight offers...`);
      try {
        const client = createTimocomClient();
        const maxConcurrent = 5;

        const results: Array<{ index: number; success: boolean; data?: unknown; error?: string }> = [];
        const failed: Array<{ index: number; error: string }> = [];
        let processed = 0;

        // Process offers in batches to avoid overwhelming the API
        for (let i = 0; i < freightOffers.length; i += maxConcurrent) {
          const batch = freightOffers.slice(i, i + maxConcurrent);
          const batchPromises = batch.map(async (offer: unknown, index: number) => {
            const actualIndex = i + index;

            // First attempt
            try {
              const result = await client.createFreightOffer(offer as CreateFreightOfferRequest);
              processed++;
              console.log(`✅ Created freight offer ${processed}/${freightOffers.length}`);
              return { index: actualIndex, success: true, data: result.data };
            } catch (error: unknown) {
              const errorMessage = getErrorMessage(error);
              console.log(
                `⚠️ First attempt failed for freight offer ${actualIndex}: ${errorMessage}. Retrying in 1 second...`,
              );

              // Wait 1 second before retry
              await new Promise((resolve) => setTimeout(resolve, 1000));

              // Retry attempt
              try {
                const result = await client.createFreightOffer(offer as CreateFreightOfferRequest);
                processed++;
                console.log(`✅ Retry successful for freight offer ${processed}/${freightOffers.length}`);
                return { index: actualIndex, success: true, data: result.data };
              } catch (retryError: unknown) {
                const retryErrorMessage = getErrorMessage(retryError);
                failed.push({
                  index: actualIndex,
                  error: `Initial: ${errorMessage}, Retry: ${retryErrorMessage}`,
                });
                console.log(`❌ Both attempts failed for freight offer ${actualIndex}: ${retryErrorMessage}`);
                return { index: actualIndex, success: false, error: retryErrorMessage };
              }
            }
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);

          // Small delay between batches to be respectful to the API
          if (i + maxConcurrent < freightOffers.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        freightTimocomResults = {
          total: freightOffers.length,
          created: results.filter((r) => r.success).length,
          failed: failed.length,
          results: {
            total: freightOffers.length,
            created: results.filter((r) => r.success).length,
            failed: failed.length,
            createdOffers: results.filter((r) => r.success).map((r) => r.data),
            failures: failed,
          },
        };

        console.log(
          `✅ Freight bulk posting completed: ${freightTimocomResults.created} successful, ${freightTimocomResults.failed} failed`,
        );
      } catch (bulkError: unknown) {
        console.error('❌ Freight bulk posting error:', bulkError);
        freightTimocomResults = { total: numFreightCount, created: 0, failed: numFreightCount };
      }

      // Post vehicle space offers to TIMOCOM using direct bulk creation
      console.log(`📤 Bulk posting ${numVehicleCount} vehicle space offers...`);
      try {
        const client = createTimocomClient();
        const maxConcurrent = 5;

        const results: Array<{ index: number; success: boolean; data?: unknown; error?: string }> = [];
        const failed: Array<{ index: number; error: string }> = [];
        let processed = 0;

        // Process offers in batches to avoid overwhelming the API
        for (let i = 0; i < vehicleSpaceOffers.length; i += maxConcurrent) {
          const batch = vehicleSpaceOffers.slice(i, i + maxConcurrent);
          const batchPromises = batch.map(async (offer: unknown, index: number) => {
            const actualIndex = i + index;

            // First attempt
            try {
              const result = await client.createVehicleSpaceOffer(offer as PublishVehicleSpaceOfferRequest);
              processed++;
              console.log(`✅ Created vehicle offer ${processed}/${vehicleSpaceOffers.length}`);
              return { index: actualIndex, success: true, data: result.data };
            } catch (error: unknown) {
              const errorMessage = getErrorMessage(error);
              console.log(
                `⚠️ First attempt failed for vehicle offer ${actualIndex}: ${errorMessage}. Retrying in 1 second...`,
              );

              // Wait 1 second before retry
              await new Promise((resolve) => setTimeout(resolve, 1000));

              // Retry attempt
              try {
                const result = await client.createVehicleSpaceOffer(offer as PublishVehicleSpaceOfferRequest);
                processed++;
                console.log(`✅ Retry successful for vehicle offer ${processed}/${vehicleSpaceOffers.length}`);
                return { index: actualIndex, success: true, data: result.data };
              } catch (retryError: unknown) {
                const retryErrorMessage = getErrorMessage(retryError);
                failed.push({
                  index: actualIndex,
                  error: `Initial: ${errorMessage}, Retry: ${retryErrorMessage}`,
                });
                console.log(`❌ Both attempts failed for vehicle offer ${actualIndex}: ${retryErrorMessage}`);
                return { index: actualIndex, success: false, error: retryErrorMessage };
              }
            }
          });

          const batchResults = await Promise.all(batchPromises);
          results.push(...batchResults);

          // Small delay between batches to be respectful to the API
          if (i + maxConcurrent < vehicleSpaceOffers.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000));
          }
        }

        vehicleTimocomResults = {
          total: vehicleSpaceOffers.length,
          created: results.filter((r) => r.success).length,
          failed: failed.length,
          results: {
            total: vehicleSpaceOffers.length,
            created: results.filter((r) => r.success).length,
            failed: failed.length,
            createdOffers: results.filter((r) => r.success).map((r) => r.data),
            failures: failed,
          },
        };

        console.log(
          `✅ Vehicle bulk posting completed: ${vehicleTimocomResults.created} successful, ${vehicleTimocomResults.failed} failed`,
        );
      } catch (bulkError: unknown) {
        console.error('❌ Vehicle bulk posting error:', bulkError);
        vehicleTimocomResults = { total: numVehicleCount, created: 0, failed: numVehicleCount };
      }

      const totalSuccessful =
        (freightTimocomResults?.created || 0) + (vehicleTimocomResults?.created || 0);
      const totalFailed =
        (freightTimocomResults?.failed || 0) + (vehicleTimocomResults?.failed || 0);
      console.log(
        `✅ TIMOCOM bulk posting completed: ${totalSuccessful} successful, ${totalFailed} failed`,
      );
    }

    const totalSuccessful =
      (freightTimocomResults?.created || 0) + (vehicleTimocomResults?.created || 0);
    const totalFailed = (freightTimocomResults?.failed || 0) + (vehicleTimocomResults?.failed || 0);

    res.json({
      success: true,
      message: autoPost
        ? `All offer types generated and posted to TIMOCOM (${numFreightCount + numVehicleCount} generated, ${totalSuccessful} posted successfully, ${totalFailed} failed)`
        : `All offer types generated successfully (${numFreightCount} freight, ${numVehicleCount} vehicle)`,
      data: {
        freight: freightOffers,
        vehicleSpace: vehicleSpaceOffers,
      },
      summary: {
        freightCount: numFreightCount,
        vehicleCount: numVehicleCount,
        totalRecords: numFreightCount + numVehicleCount,
        freightDataSize: freightDataSize,
        vehicleDataSize: vehicleDataSize,
        freightDataSizeFormatted: `${(freightDataSize / 1024 / 1024).toFixed(2)} MB`,
        vehicleDataSizeFormatted: `${(vehicleDataSize / 1024 / 1024).toFixed(2)} MB`,
      },
      autoPost: autoPost,
      timocomResults: autoPost
        ? {
            totalGenerated: numFreightCount + numVehicleCount,
            totalSuccessful: totalSuccessful,
            totalFailed: totalFailed,
            freight: freightTimocomResults,
            vehicleSpace: vehicleTimocomResults,
          }
        : undefined,
      generated: new Date().toISOString(),
    });
  } catch (error: unknown) {
    res
      .status(500)
      .json(handleRouteError(error, 'POST /generate/all', 'Failed to generate all offers'));
  }
});

export default router;
