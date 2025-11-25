import express, { type Request, type Response } from 'express';
import {
  createConsolidationScript,
  exportTimocomDataForConsolidation,
} from '../../scripts/export-consolidation.js';
import { exportMixedConsolidationData } from '../../scripts/export-mixed-consolidation.js';
import { handleRouteError } from '../../utils/error-handler.js';

const router = express.Router();

/**
 * CONSOLIDATION EXPORT API
 *
 * Export TIMOCOM data in format compatible with AssignmentProblem_Consolid
 */

// Export TIMOCOM data for consolidation analysis
router.post('/export', async (req: Request, res: Response) => {
  try {
    const {
      outputDir = './consolid_export',
      includeVehicles = true,
      includeOrders = true,
      maxVehicles = 100,
      maxOrders = 1000,
    } = req.body;

    console.log('🔄 API: Starting TIMOCOM data export for consolidation...');

    const exportDir = await exportTimocomDataForConsolidation({
      outputDir,
      includeVehicles,
      includeOrders,
      maxVehicles,
      maxOrders,
    });

    // Create the consolidation script
    createConsolidationScript(exportDir);

    res.json({
      success: true,
      message: 'TIMOCOM data exported successfully for consolidation analysis',
      exportDirectory: exportDir,
      files: {
        json: `${exportDir}/timocom_consolidation_data.json`,
        config: `${exportDir}/consolid_config.json`,
        vehicles: `${exportDir}/vehicles.csv`,
        orders: `${exportDir}/orders.csv`,
        script: `${exportDir}/run_consolidation.sh`,
      },
      instructions: {
        build: 'cd ../AssignmentProblem_Consolid && ./build.sh',
        run: `cd ${exportDir} && ./run_consolidation.sh`,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: unknown) {
    res
      .status(500)
      .json(
        handleRouteError(
          error,
          'POST /consolidation/export',
          'Failed to export TIMOCOM data for consolidation',
        ),
      );
  }
});

// Get consolidation export status/info
router.get('/info', (_req: Request, res: Response) => {
  res.json({
    success: true,
    description: 'TIMOCOM to AssignmentProblem_Consolid data export service',
    capabilities: {
      vehicleExport: 'Export vehicle space offers as consolidation vehicles',
      orderExport: 'Export freight offers as consolidation orders',
      csvFormat: 'Generate CSV files compatible with Consolid algorithms',
      configGeneration: 'Create configuration files for optimization runs',
      scriptGeneration: 'Generate shell scripts for easy execution',
    },
    formats: {
      json: 'Complete data export in JSON format',
      csv: 'Separate CSV files for vehicles and orders',
      config: 'AssignmentProblem_Consolid configuration file',
    },
    workflow: [
      'POST /api/consolidation/export - Export TIMOCOM data',
      'Build AssignmentProblem_Consolid if needed',
      'Run consolidation analysis using generated script',
      'Analyze results in consolidation_cases.csv',
    ],
    parameters: {
      outputDir: 'Output directory (default: ./consolid_export)',
      includeVehicles: 'Include vehicle space offers (default: true)',
      includeOrders: 'Include freight offers (default: true)',
      maxVehicles: 'Maximum vehicles to export (default: 100)',
      maxOrders: 'Maximum orders to export (default: 1000)',
    },
    requirements: {
      timocom: 'Valid TIMOCOM API credentials',
      consolid: 'AssignmentProblem_Consolid built and available',
      permissions: 'Write access to export directory',
    },
  });
});

// Export mixed data: mock vehicles + real TIMOCOM freight offers
router.post('/export-mixed', async (req: Request, res: Response) => {
  try {
    const {
      outputDir = './mixed_consolidation_export',
      mockVehicleCount = 5,
      maxOrders = 10,
      format = 'both',
      configName = 'mixed_consolid',
    } = req.body;

    const result = await exportMixedConsolidationData({
      outputDir,
      mockVehicleCount,
      maxOrders,
      format,
      configName,
    });

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        exportDirectory: result.exportDirectory,
        files: result.files,
        data: {
          vehicles: result.data?.vehicles.length || 0,
          orders: result.data?.orders.length || 0,
          metadata: result.data?.metadata,
        },
        instructions: {
          build: 'cd ../AssignmentProblem_Consolid && ./build.sh',
          run: `cd ${result.exportDirectory} && ./run_mixed_consolidation.sh`,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        success: false,
        error: result.message,
      });
    }
  } catch (error) {
    const errorResponse = handleRouteError(
      error,
      'Mixed consolidation export',
      'Mixed consolidation export failed',
    );
    res.status(500).json(errorResponse);
  }
});

export default router;
