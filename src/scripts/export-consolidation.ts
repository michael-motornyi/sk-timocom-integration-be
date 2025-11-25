import fs from 'node:fs';
import path from 'node:path';
import { createTimocomApi } from '../timocom-client.js';

interface ConsolidationVehicle {
  id: string;
  type: string;
  capacity: {
    weight: number;
    volume: number;
  };
  costs: {
    base: number;
    perKm: number;
    perPoint: number;
  };
  location: {
    lat: number;
    lng: number;
    city: string;
    country: string;
  };
}

interface ConsolidationOrder {
  id: string;
  weight: number;
  volume: number;
  pickup: {
    lat: number;
    lng: number;
    city: string;
    country: string;
    timeWindow?: {
      start: string;
      end: string;
    };
  };
  delivery: {
    lat: number;
    lng: number;
    city: string;
    country: string;
    timeWindow?: {
      start: string;
    };
  };
  revenue?: number;
}

interface ConsolidationData {
  vehicles: ConsolidationVehicle[];
  orders: ConsolidationOrder[];
  metadata: {
    exported: string;
    source: string;
    totalVehicles: number;
    totalOrders: number;
  };
}

/**
 * Convert TIMOCOM vehicle space offer to consolidation vehicle format
 */
function convertVehicleSpaceOffer(offer: unknown, index: number): ConsolidationVehicle {
  const offerData = offer as Record<string, unknown>;
  return {
    id: (offerData.id as string) || `vehicle_${index}`,
    type:
      ((offerData.vehicleProperties as Record<string, unknown>)?.type as string[])?.[0] ||
      'VEHICLE_UP_TO_12_T',
    capacity: {
      weight: 12000, // Default 12t capacity
      volume: 50, // Default 50m³ volume
    },
    costs: {
      base: 500, // Base cost in EUR
      perKm: 1.2, // Cost per km
      perPoint: 25, // Cost per stop
    },
    location: {
      lat: 52.52, // Default to Berlin coordinates
      lng: 13.405,
      city: ((offerData.start as Record<string, unknown>)?.city as string) || 'Berlin',
      country: ((offerData.start as Record<string, unknown>)?.country as string) || 'DE',
    },
  };
}

/**
 * Convert TIMOCOM freight offer to consolidation order format
 */
function convertFreightOffer(offer: unknown, index: number): ConsolidationOrder {
  const offerData = offer as Record<string, unknown>;
  const startData = (offerData.start as Record<string, unknown>) || {};
  const destinationData = (offerData.destination as Record<string, unknown>) || {};
  const cargoData = (offerData.cargo as Record<string, unknown>) || {};

  const timeWindow = startData.loadingDate
    ? {
        start: startData.loadingDate as string,
        end: startData.loadingDate as string,
      }
    : undefined;

  return {
    id: (offerData.id as string) || `order_${index}`,
    weight: (cargoData.weight as number) || 1000,
    volume: (cargoData.volume as number) || 10,
    pickup: {
      lat: 52.52, // Default coordinates - would need geocoding service
      lng: 13.405,
      city: (startData.city as string) || 'Berlin',
      country: (startData.country as string) || 'DE',
      ...(timeWindow && { timeWindow }),
    },
    delivery: {
      lat: 48.1351, // Default to Munich coordinates
      lng: 11.582,
      city: (destinationData.city as string) || 'Munich',
      country: (destinationData.country as string) || 'DE',
    },
    revenue: 1000, // Default revenue - could be calculated from distance/weight
  };
}

/**
 * Export TIMOCOM data to AssignmentProblem_Consolid format
 */
export async function exportTimocomDataForConsolidation(
  options: {
    outputDir?: string;
    includeVehicles?: boolean;
    includeOrders?: boolean;
    maxVehicles?: number;
    maxOrders?: number;
  } = {},
): Promise<string> {
  const {
    outputDir = './consolid_export',
    includeVehicles = true,
    includeOrders = true,
    maxVehicles = 100,
    maxOrders = 1000,
  } = options;

  try {
    console.log('🔄 Fetching data from TIMOCOM API...');

    // Create TIMOCOM client
    const client = createTimocomApi();

    // Test connection
    const connectionTest = await client.testConnection();
    if (!connectionTest.success) {
      throw new Error(`TIMOCOM connection failed: ${connectionTest.error}`);
    }

    const consolidationData: ConsolidationData = {
      vehicles: [],
      orders: [],
      metadata: {
        exported: new Date().toISOString(),
        source: 'TIMOCOM API',
        totalVehicles: 0,
        totalOrders: 0,
      },
    };

    // Fetch vehicle space offers if requested
    if (includeVehicles) {
      console.log('📦 Fetching vehicle space offers...');
      try {
        const vehicleResult = await client.getMyVehicleSpaceOffers();
        if (vehicleResult.success && vehicleResult.data) {
          const responseData = vehicleResult.data as unknown as Record<string, unknown>;
          const vehicles = (responseData.payload as unknown[]) || [];
          const limitedVehicles = vehicles.slice(0, maxVehicles);

          consolidationData.vehicles = limitedVehicles.map((vehicle: unknown, index: number) =>
            convertVehicleSpaceOffer(vehicle, index),
          );

          console.log(`✅ Converted ${consolidationData.vehicles.length} vehicle space offers`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch vehicle space offers:', (error as Error).message);
      }
    }

    // Fetch freight offers if requested
    if (includeOrders) {
      console.log('📦 Fetching freight offers...');
      try {
        const freightResult = await client.getMyFreightOffers();
        if (freightResult.success && freightResult.data) {
          const responseData = freightResult.data as unknown as Record<string, unknown>;
          const orders = (responseData.payload as unknown[]) || [];
          const limitedOrders = orders.slice(0, maxOrders);

          consolidationData.orders = limitedOrders.map((order: unknown, index: number) =>
            convertFreightOffer(order, index),
          );

          console.log(`✅ Converted ${consolidationData.orders.length} freight offers`);
        }
      } catch (error) {
        console.warn('⚠️ Could not fetch freight offers:', (error as Error).message);
      }
    }

    consolidationData.metadata.totalVehicles = consolidationData.vehicles.length;
    consolidationData.metadata.totalOrders = consolidationData.orders.length;

    // Create output directory
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Export as JSON for AssignmentProblem_Consolid
    const jsonPath = path.join(outputDir, 'timocom_consolidation_data.json');
    fs.writeFileSync(jsonPath, JSON.stringify(consolidationData, null, 2));

    // Export as CSV format (compatible with existing Consolid scripts)
    if (consolidationData.vehicles.length > 0) {
      const vehicleCsvPath = path.join(outputDir, 'vehicles.csv');
      const vehicleCsvContent = [
        'id,type,weight_capacity,volume_capacity,base_cost,cost_per_km,cost_per_point,lat,lng,city,country',
        ...consolidationData.vehicles.map(
          (v) =>
            `${v.id},${v.type},${v.capacity.weight},${v.capacity.volume},${v.costs.base},${v.costs.perKm},${v.costs.perPoint},${v.location.lat},${v.location.lng},${v.location.city},${v.location.country}`,
        ),
      ].join('\n');
      fs.writeFileSync(vehicleCsvPath, vehicleCsvContent);
    }

    if (consolidationData.orders.length > 0) {
      const ordersCsvPath = path.join(outputDir, 'orders.csv');
      const ordersCsvContent = [
        'id,weight,volume,pickup_lat,pickup_lng,pickup_city,pickup_country,delivery_lat,delivery_lng,delivery_city,delivery_country,revenue',
        ...consolidationData.orders.map(
          (o) =>
            `${o.id},${o.weight},${o.volume},${o.pickup.lat},${o.pickup.lng},${o.pickup.city},${o.pickup.country},${o.delivery.lat},${o.delivery.lng},${o.delivery.city},${o.delivery.country},${o.revenue || 0}`,
        ),
      ].join('\n');
      fs.writeFileSync(ordersCsvPath, ordersCsvContent);
    }

    // Create AssignmentProblem_Consolid config file
    const configPath = path.join(outputDir, 'consolid_config.json');
    const config = {
      csv: path.join(outputDir, 'consolidation_cases.csv'),
      nonconsolidated: path.join(outputDir, 'non_consolidated.csv'),
      vehicles: path.join(outputDir, 'vehicles.csv'),
      orders: path.join(outputDir, 'orders.csv'),
      matrix: 'data/matrix.csv', // Would need to be generated separately
      constraints: {
        maxWeight: 12000,
        maxVolume: 50,
        maxConsolidations: 5,
      },
      optimization: {
        algorithm: 'cost',
        iterations: 1000,
        timeLimit: 300,
      },
      metadata: consolidationData.metadata,
    };

    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

    console.log('\n📊 Export Summary:');
    console.log(`├── Vehicles exported: ${consolidationData.metadata.totalVehicles}`);
    console.log(`├── Orders exported: ${consolidationData.metadata.totalOrders}`);
    console.log(`├── Output directory: ${outputDir}`);
    console.log(`├── JSON data: ${jsonPath}`);
    console.log(`├── Config file: ${configPath}`);
    console.log('└── CSV files: vehicles.csv, orders.csv');

    return outputDir;
  } catch (error) {
    console.error('❌ Error exporting TIMOCOM data for consolidation:', error);
    throw error;
  }
}

/**
 * Create a consolidation analysis script that can be run with AssignmentProblem_Consolid
 */
export function createConsolidationScript(outputDir: string): string {
  const scriptPath = path.join(outputDir, 'run_consolidation.sh');
  const scriptContent = `#!/bin/bash

# TIMOCOM Data Consolidation Analysis Script
# Generated from TIMOCOM Integration

echo "🔄 Starting consolidation analysis..."

# Check if AssignmentProblem_Consolid is available
CONSOLID_PATH="../AssignmentProblem_Consolid/bin/AssignmentProblem_Consolid"

if [ ! -f "$CONSOLID_PATH" ]; then
    echo "❌ AssignmentProblem_Consolid not found at $CONSOLID_PATH"
    echo "Please build AssignmentProblem_Consolid first:"
    echo "  cd ../AssignmentProblem_Consolid"
    echo "  ./build.sh"
    exit 1
fi

# Run consolidation optimization
echo "📊 Running consolidation optimization..."
$CONSOLID_PATH consolid_config.json

echo "✅ Consolidation analysis completed!"
echo "Results available in:"
echo "  - consolidation_cases.csv (optimized consolidations)"
echo "  - non_consolidated.csv (non-consolidated items)"
`;

  fs.writeFileSync(scriptPath, scriptContent);
  fs.chmodSync(scriptPath, 0o755); // Make executable

  return scriptPath;
}

// CLI interface
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const outputDir = args[0] || './consolid_export';

  exportTimocomDataForConsolidation({ outputDir })
    .then((dir) => {
      console.log(`\n🎉 Export completed successfully! Output directory: ${dir}`);

      createConsolidationScript(dir);
      console.log('\n📋 To run consolidation analysis:');
      console.log(`  cd ${dir}`);
      console.log('  ./run_consolidation.sh');
    })
    .catch((error) => {
      console.error('Export failed:', error);
      process.exit(1);
    });
}
