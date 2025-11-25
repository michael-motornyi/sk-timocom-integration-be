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
      'GET /api/timocom/vehicle-space-offers': 'Get all vehicle space offers from TIMOCOM',
      'GET /api/timocom/vehicle-space-offers/:id': 'Get specific vehicle space offer by ID',
      'POST /api/timocom/vehicle-space-offers': 'Create new vehicle space offer in TIMOCOM',
      'DELETE /api/timocom/vehicle-space-offers/:id': 'Delete vehicle space offer from TIMOCOM',
      'GET /api/consolidation/info': 'Get consolidation export service information',
      'POST /api/consolidation/export': 'Export TIMOCOM data for AssignmentProblem_Consolid',
      'GET /api/docs': 'This documentation',
    },
    examples: {
      generateFreight: {
        method: 'POST',
        url: '/api/generate/freight',
        body: { count: 500 },
        description: 'Generates 500 freight offers and returns them directly in response',
        curl: 'curl -X POST http://localhost:3001/api/generate/freight -H "Content-Type: application/json" -d \'{"count": 500}\'',
      },
      generateVehicle: {
        method: 'POST',
        url: '/api/generate/vehicle-space',
        body: { count: 300 },
        description: 'Generates 300 vehicle space offers and returns them directly in response',
        curl: 'curl -X POST http://localhost:3001/api/generate/vehicle-space -H "Content-Type: application/json" -d \'{"count": 300}\'',
      },
      generateAll: {
        method: 'POST',
        url: '/api/generate/all',
        body: { freightCount: 300, vehicleCount: 200 },
        description: 'Generate 300 freight and 200 vehicle space offers, returns both in response',
        curl: 'curl -X POST http://localhost:3001/api/generate/all -H "Content-Type: application/json" -d \'{"freightCount": 300, "vehicleCount": 200}\'',
      },
      timocomTest: {
        method: 'GET',
        url: '/api/timocom/test',
        headers: { 'X-TIMOCOM-API-Key': 'your-api-key' },
        description: 'Test connection to TIMOCOM API',
        curl: 'curl -X GET http://localhost:3001/api/timocom/test',
      },
      timocomGetFreightOffers: {
        method: 'GET',
        url: '/api/timocom/freight-offers',
        description: 'Get all freight offers from TIMOCOM',
        curl: 'curl -X GET http://localhost:3001/api/timocom/freight-offers',
      },
      timocomGetVehicleSpaceOffers: {
        method: 'GET',
        url: '/api/timocom/vehicle-space-offers',
        description: 'Get all vehicle space offers from TIMOCOM',
        curl: 'curl -X GET http://localhost:3001/api/timocom/vehicle-space-offers',
      },
      timocomCreateFreightOffer: {
        method: 'POST',
        url: '/api/timocom/freight-offers',
        body: {
          freightDescription: 'Steel coils',
          weight_t: 25.5,
          loadingPlaces: [{ loadingType: 'LOADING', address: { country: 'DE', city: 'Berlin' } }],
        },
        description: 'Create new freight offer in TIMOCOM',
        curl: 'curl -X POST http://localhost:3001/api/timocom/freight-offers -H "Content-Type: application/json" -d \'{"freightDescription": "Steel coils", "weight_t": 25.5, "loadingPlaces": [{"loadingType": "LOADING", "address": {"country": "DE", "city": "Berlin"}}]}\'',
      },
      timocomCreateVehicleSpaceOffer: {
        method: 'POST',
        url: '/api/timocom/vehicle-space-offers',
        body: {
          customer: { id: 902245 },
          contactPerson: {
            title: 'MR',
            firstName: 'John',
            lastName: 'Doe',
            email: 'john@example.com',
            languages: ['en'],
            businessPhone: '+49 123 456 789',
          },
          vehicleProperties: { body: ['MOVING_FLOOR'], type: ['VEHICLE_UP_TO_12_T'] },
          start: { objectType: 'address', country: 'DE', city: 'Berlin' },
          loadingDate: '2025-12-01',
        },
        description: 'Create new vehicle space offer in TIMOCOM',
        curl: 'curl -X POST http://localhost:3001/api/timocom/vehicle-space-offers -H "Content-Type: application/json" -d \'{"customer": {"id": 902245}, "contactPerson": {"title": "MR", "firstName": "John", "lastName": "Doe", "email": "john@example.com", "languages": ["en"], "businessPhone": "+49 123 456 789"}, "vehicleProperties": {"body": ["MOVING_FLOOR"], "type": ["VEHICLE_UP_TO_12_T"]}, "start": {"objectType": "address", "country": "DE", "city": "Berlin"}, "loadingDate": "2025-12-01"}\'',
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
