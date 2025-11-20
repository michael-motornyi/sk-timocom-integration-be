import express from 'express';
import { handleRouteError } from '../../../utils/error-handler.js';
import { createTimocomClient, requireTimocomConfig } from './common.js';
import freightOffersRouter from './freight-offers.js';
import vehicleSpaceOffersRouter from './vehicle-space-offers.js';

const router = express.Router();

// Test TIMOCOM API connection
router.get('/test', requireTimocomConfig, async (_req, res) => {
  try {
    const client = createTimocomClient();
    const result = await client.testConnection();

    res.json(result);
  } catch (error) {
    res.status(500).json(handleRouteError(error, 'GET /test', 'Failed to test TIMOCOM connection'));
  }
});

// Mount sub-routers
router.use('/', freightOffersRouter);
router.use('/', vehicleSpaceOffersRouter);

export default router;
