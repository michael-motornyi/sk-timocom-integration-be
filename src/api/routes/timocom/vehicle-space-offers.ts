import express from 'express';
import { requireTimocomConfig } from './common.js';
import {
  createDeleteAllHandler,
  createDeleteHandler,
  createGetAllHandler,
  createGetByIdHandler,
  createPostHandler,
} from './handlers.js';

const router = express.Router();

// Get all vehicle space offers
router.get(
  '/vehicle-space-offers',
  requireTimocomConfig,
  createGetAllHandler(
    'getMyVehicleSpaceOffers',
    'GET /vehicle-space-offers',
    'Failed to fetch vehicle space offers',
  ),
);

// Get specific vehicle space offer by ID
router.get(
  '/vehicle-space-offers/:publicOfferId',
  requireTimocomConfig,
  createGetByIdHandler(
    'getVehicleSpaceOffer',
    'GET /vehicle-space-offers/:id',
    'Failed to get vehicle space offer',
  ),
);

// Create new vehicle space offer
router.post(
  '/vehicle-space-offers',
  requireTimocomConfig,
  createPostHandler('createVehicleSpaceOffer', 'POST /vehicle-space-offers', 'vehicle space offer'),
);

// Delete vehicle space offer
router.delete(
  '/vehicle-space-offers/:publicOfferId',
  requireTimocomConfig,
  createDeleteHandler('deleteVehicleSpaceOffer'),
);

// Delete all vehicle space offers (POST version - more reliable)
router.post(
  '/vehicle-space-offers/delete-all',
  requireTimocomConfig,
  createDeleteAllHandler('getMyVehicleSpaceOffers', 'deleteVehicleSpaceOffer', {
    routeName: 'POST /vehicle-space-offers/delete-all',
    resourceName: 'vehicle space offer',
    pluralResourceName: 'vehicle space offers',
    emoji: '🚛',
  }),
);

export default router;
