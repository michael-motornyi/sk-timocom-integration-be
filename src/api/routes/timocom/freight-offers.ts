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

// Get all freight offers
router.get(
  '/freight-offers',
  requireTimocomConfig,
  createGetAllHandler(
    'getMyFreightOffers',
    'GET /freight-offers',
    'Failed to fetch freight offers',
  ),
);

// Get specific freight offer by ID
router.get(
  '/freight-offers/:publicOfferId',
  requireTimocomConfig,
  createGetByIdHandler('getFreightOffer', 'GET /freight-offers/:id', 'Failed to get freight offer'),
);

// Create new freight offer
router.post(
  '/freight-offers',
  requireTimocomConfig,
  createPostHandler('createFreightOffer', 'POST /freight-offers', 'freight offer'),
);

// Delete freight offer
router.delete(
  '/freight-offers/:publicOfferId',
  requireTimocomConfig,
  createDeleteHandler('deleteFreightOffer'),
);

// Delete all freight offers (POST version - more reliable)
router.post(
  '/freight-offers/delete-all',
  requireTimocomConfig,
  createDeleteAllHandler('getMyFreightOffers', 'deleteFreightOffer', {
    routeName: 'POST /freight-offers/delete-all',
    resourceName: 'freight offer',
    pluralResourceName: 'freight offers',
    emoji: '🚚',
  }),
);

export default router;
