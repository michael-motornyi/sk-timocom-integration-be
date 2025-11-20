import express, { type Request, type Response } from 'express';

const router = express.Router();

// Health check endpoint
router.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: '1.0.0',
  });
});

// API documentation endpoint
router.get('/api/docs', (_req: Request, res: Response) => {
  res.json({
    title: 'TIMOCOM SDK Generator API',
    version: '1.0.0',
    endpoints: {
      'GET /health': 'Health check',
      'POST /api/generate/freight':
        'Generate freight offers and return data (default: 1000, max: 10000)',
      'POST /api/generate/vehicle-space':
        'Generate vehicle space offers and return data (default: 1000, max: 10000)',
      'POST /api/generate/all': 'Generate both freight and vehicle space offers and return data',
      'POST /api/csv/upload/:type': 'Upload CSV files (type: freight|vehicle)',
      'GET /api/csv/info/:type': 'Get CSV file information and validation',
      'GET /api/csv/backups': 'List all backup files',
      'POST /api/csv/restore/:filename': 'Restore from backup file',
      'GET /api/timocom/test': 'Test TIMOCOM API connection (requires API key)',
      'GET /api/timocom/freight-offers': 'Get all freight offers from TIMOCOM',
      'GET /api/timocom/freight-offers/:id': 'Get specific freight offer by ID',
      'POST /api/timocom/freight-offers': 'Create new freight offer in TIMOCOM',
      'PUT /api/timocom/freight-offers/:id': 'Update freight offer in TIMOCOM',
      'DELETE /api/timocom/freight-offers/:id': 'Delete freight offer from TIMOCOM',
      'POST /api/timocom/freight-offers/bulk': 'Bulk create freight offers in TIMOCOM',
      'GET /api/docs': 'This documentation',
    },
    examples: {
      generateFreight: {
        method: 'POST',
        url: '/api/generate/freight',
        body: { count: 500 },
        description: 'Generates 500 freight offers and returns them directly in response',
      },
      generateVehicle: {
        method: 'POST',
        url: '/api/generate/vehicle-space',
        body: { count: 300 },
        description: 'Generates 300 vehicle space offers and returns them directly in response',
      },
      generateAll: {
        method: 'POST',
        url: '/api/generate/all',
        body: { freightCount: 300, vehicleCount: 200 },
        description: 'Generate 300 freight and 200 vehicle space offers, returns both in response',
      },
      timocomTest: {
        method: 'GET',
        url: '/api/timocom/test',
        headers: { 'X-TIMOCOM-API-Key': 'your-api-key' },
        description: 'Test connection to TIMOCOM API',
      },
      timocomGetOffers: {
        method: 'GET',
        url: '/api/timocom/freight-offers?page=1&limit=10',
        headers: { 'X-TIMOCOM-API-Key': 'your-api-key' },
        description: 'Get paginated list of freight offers from TIMOCOM',
      },
      timocomCreateOffer: {
        method: 'POST',
        url: '/api/timocom/freight-offers',
        headers: { 'X-TIMOCOM-API-Key': 'your-api-key' },
        body: {
          freightDescription: 'Steel coils',
          weight_t: 25.5,
          loadingPlaces: [{ loadingType: 'LOADING', address: { country: 'DE', city: 'Berlin' } }],
        },
        description: 'Create new freight offer in TIMOCOM',
      },
      timocomBulkCreate: {
        method: 'POST',
        url: '/api/timocom/freight-offers/bulk',
        headers: { 'X-TIMOCOM-API-Key': 'your-api-key' },
        body: {
          offers: [
            /* array of freight offers */
          ],
          maxConcurrent: 5,
        },
        description: 'Bulk create multiple freight offers in TIMOCOM',
      },
    },
  });
});

// Root endpoint
router.get('/', (_req: Request, res: Response) => {
  res.json({
    message: 'TIMOCOM SDK Generator API',
    version: '1.0.0',
    documentation: '/api/docs',
    health: '/health',
  });
});

export default router;
