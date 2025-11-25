import { createTimocomApi } from '../timocom-client.js';

interface ConsolidationVehicle {
  id: string;
  type: string;
  capacity: {
    weight: number;
    volume: number;
  };
  location: {
    start: string;
    destination?: string;
  };
}

interface ConsolidationOrder {
  id: string;
  description: string;
  requirements: {
    weight: number;
    volume: number;
    vehicleType: string;
  };
  route: {
    pickup: {
      location: string;
      timeWindow: {
        start: string;
        end: string;
      };
    };
    delivery: {
      location: string;
      timeWindow: {
        start: string;
        end: string;
      };
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
 * Generate mock vehicle space offers
 */
function generateMockVehicleSpaceOffers(count = 5): ConsolidationVehicle[] {
  const cities = [
    { name: 'Berlin', country: 'DE' },
    { name: 'Munich', country: 'DE' },
    { name: 'Hamburg', country: 'DE' },
    { name: 'Warszawa', country: 'PL' },
    { name: 'Praha', country: 'CZ' },
    { name: 'Vienna', country: 'AT' },
    { name: 'Amsterdam', country: 'NL' },
    { name: 'Brussels', country: 'BE' },
  ];

  const vehicleTypes = [
    'VEHICLE_UP_TO_12_T',
    'VEHICLE_UP_TO_7_5_T',
    'VEHICLE_UP_TO_3_5_T',
  ] as const;

  return Array.from({ length: count }, (_, index) => {
    const startCity = cities[Math.floor(Math.random() * cities.length)] ?? cities[0];
    const destCity = cities[Math.floor(Math.random() * cities.length)] ?? cities[1];
    const vehicleType =
      vehicleTypes[Math.floor(Math.random() * vehicleTypes.length)] ?? 'VEHICLE_UP_TO_12_T';

    let capacity = { weight: 12000, volume: 50 };
    if (vehicleType === 'VEHICLE_UP_TO_7_5_T') {
      capacity = { weight: 7500, volume: 35 };
    } else if (vehicleType === 'VEHICLE_UP_TO_3_5_T') {
      capacity = { weight: 3500, volume: 20 };
    }

    return {
      id: `mock_vehicle_${index + 1}`,
      type: vehicleType,
      capacity,
      location: {
        start: `${startCity?.name ?? 'Berlin'}, ${startCity?.country ?? 'DE'}`,
        destination: `${destCity?.name ?? 'Munich'}, ${destCity?.country ?? 'DE'}`,
      },
    };
  });
}

/**
 * Convert TIMOCOM freight offer to consolidation order format
 */
function convertFreightOffer(offer: unknown, index: number): ConsolidationOrder {
  const offerData = offer as Record<string, unknown>;
  const loadingPlaces = (offerData.loadingPlaces as Record<string, unknown>[]) || [];

  const pickup = loadingPlaces.find((p) => p.loadingType === 'LOADING');
  const delivery = loadingPlaces.find((p) => p.loadingType === 'UNLOADING');

  const pickupAddress = pickup?.address as Record<string, unknown>;
  const deliveryAddress = delivery?.address as Record<string, unknown>;

  const weight = ((offerData.weight_t as number) || 1) * 1000; // Convert to kg
  const length = (offerData.length_m as number) || 2;
  const estimatedVolume = length * 2.4 * 2.4; // Estimate volume based on length

  return {
    id: (offerData.id as string) || `order_${index}`,
    description: (offerData.freightDescription as string) || 'General cargo',
    requirements: {
      weight,
      volume: estimatedVolume,
      vehicleType:
        ((offerData.vehicleProperties as Record<string, unknown>)?.type as string[])?.[0] ||
        'VEHICLE_UP_TO_12_T',
    },
    route: {
      pickup: {
        location: `${pickupAddress?.city || 'Unknown'}, ${pickupAddress?.country || 'EU'}`,
        timeWindow: {
          start: (pickup?.earliestLoadingDate as string) || '2025-11-26',
          end: (pickup?.latestLoadingDate as string) || '2025-11-26',
        },
      },
      delivery: {
        location: `${deliveryAddress?.city || 'Unknown'}, ${deliveryAddress?.country || 'EU'}`,
        timeWindow: {
          start: (delivery?.earliestLoadingDate as string) || '2025-11-27',
          end: (delivery?.latestLoadingDate as string) || '2025-11-27',
        },
      },
    },
    revenue: Math.floor(Math.random() * 500) + 200, // Mock revenue 200-700€
  };
}

/**
 * Export mixed data: mock vehicles + real TIMOCOM freight offers
 */
export async function exportMixedConsolidationData(
  options: {
    outputDir?: string;
    mockVehicleCount?: number;
    maxOrders?: number;
    format?: 'json' | 'csv' | 'both';
    configName?: string;
  } = {},
): Promise<{
  success: boolean;
  message: string;
  data?: ConsolidationData;
  files?: Record<string, string>;
  exportDirectory?: string;
}> {
  try {
    const {
      outputDir = './mixed_consolidation_export',
      mockVehicleCount = 5,
      maxOrders = 10,
      format = 'both',
      configName = 'mixed_consolid',
    } = options;

    console.log('🚛 Exporting mixed consolidation data...');
    console.log(`📦 Mock vehicles: ${mockVehicleCount}, Max orders from TIMOCOM: ${maxOrders}`);

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
        source: 'Mixed: Mock Vehicles + TIMOCOM Freight',
        totalVehicles: 0,
        totalOrders: 0,
      },
    };

    // Generate mock vehicle space offers
    console.log('🚚 Generating mock vehicle space offers...');
    consolidationData.vehicles = generateMockVehicleSpaceOffers(mockVehicleCount);
    console.log(`✅ Generated ${consolidationData.vehicles.length} mock vehicles`);

    // Fetch real freight offers from TIMOCOM
    console.log('📦 Fetching real freight offers from TIMOCOM...');
    try {
      const freightResult = await client.getMyFreightOffers();
      if (freightResult.success && freightResult.data) {
        const responseData = freightResult.data as unknown as Record<string, unknown>;
        const orders = (responseData.payload as unknown[]) || [];
        const limitedOrders = orders.slice(0, maxOrders);

        consolidationData.orders = limitedOrders.map((order: unknown, index: number) =>
          convertFreightOffer(order, index),
        );

        console.log(`✅ Converted ${consolidationData.orders.length} freight offers from TIMOCOM`);
      }
    } catch (error) {
      console.warn('⚠️ Could not fetch freight offers, using mock data:', (error as Error).message);
      // Fallback to mock freight data if TIMOCOM fails
      consolidationData.orders = [
        {
          id: 'mock_order_1',
          description: 'Mock freight offer (TIMOCOM unavailable)',
          requirements: {
            weight: 2500,
            volume: 15,
            vehicleType: 'VEHICLE_UP_TO_12_T',
          },
          route: {
            pickup: {
              location: 'Berlin, DE',
              timeWindow: {
                start: '2025-11-26',
                end: '2025-11-26',
              },
            },
            delivery: {
              location: 'Munich, DE',
              timeWindow: {
                start: '2025-11-27',
                end: '2025-11-27',
              },
            },
          },
          revenue: 350,
        },
      ];
    }

    // Update metadata
    consolidationData.metadata.totalVehicles = consolidationData.vehicles.length;
    consolidationData.metadata.totalOrders = consolidationData.orders.length;

    // Export files (using the existing export logic)
    const fs = await import('node:fs');
    const path = await import('node:path');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const files: Record<string, string> = {};

    // Write JSON data
    if (format === 'json' || format === 'both') {
      const jsonPath = path.join(outputDir, 'timocom_consolidation_data.json');
      fs.writeFileSync(jsonPath, JSON.stringify(consolidationData, null, 2));
      files.json = jsonPath;
    }

    // Write CSV files
    if (format === 'csv' || format === 'both') {
      // Vehicles CSV
      const vehiclesCsv = [
        'id,type,weight_capacity,volume_capacity,start_location,destination',
        ...consolidationData.vehicles.map(
          (v) =>
            `${v.id},${v.type},${v.capacity.weight},${v.capacity.volume},"${v.location.start}","${v.location.destination || 'Flexible'}"`,
        ),
      ].join('\n');

      const vehiclesCsvPath = path.join(outputDir, 'vehicles.csv');
      fs.writeFileSync(vehiclesCsvPath, vehiclesCsv);
      files.vehicles = vehiclesCsvPath;

      // Orders CSV
      const ordersCsv = [
        'id,description,weight_kg,volume_m3,pickup_location,delivery_location,pickup_start,pickup_end,delivery_start,delivery_end,revenue',
        ...consolidationData.orders.map(
          (o) =>
            `${o.id},"${o.description}",${o.requirements.weight},${o.requirements.volume},"${o.route.pickup.location}","${o.route.delivery.location}",${o.route.pickup.timeWindow.start},${o.route.pickup.timeWindow.end},${o.route.delivery.timeWindow.start},${o.route.delivery.timeWindow.end},${o.revenue || 0}`,
        ),
      ].join('\n');

      const ordersCsvPath = path.join(outputDir, 'orders.csv');
      fs.writeFileSync(ordersCsvPath, ordersCsv);
      files.orders = ordersCsvPath;
    }

    // Create config file
    const config = {
      solver: 'AssignmentProblem_Consolid',
      version: '1.0',
      algorithm: 'hungarian_method',
      objective: 'maximize_revenue',
      constraints: {
        capacity: true,
        time_windows: true,
        vehicle_compatibility: true,
      },
      input_files: {
        vehicles: './vehicles.csv',
        orders: './orders.csv',
      },
      output_files: {
        assignments: './assignments.json',
        solution: './solution.csv',
        report: './optimization_report.txt',
      },
    };

    const configPath = path.join(outputDir, `${configName}_config.json`);
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2));
    files.config = configPath;

    // Create run script
    const runScript = `#!/bin/bash
# Mixed TIMOCOM Consolidation Optimization Script
# Generated: ${new Date().toISOString()}

echo "🚛 Starting Mixed TIMOCOM Consolidation Analysis..."
echo "📊 Data: ${consolidationData.metadata.totalVehicles} mock vehicles, ${consolidationData.metadata.totalOrders} real freight orders"
echo "🔗 Source: ${consolidationData.metadata.source}"

# Check if AssignmentProblem_Consolid exists
if [ ! -f "../AssignmentProblem_Consolid/consolid" ]; then
    echo "❌ AssignmentProblem_Consolid not found!"
    echo "📋 Please build it first:"
    echo "   cd ../AssignmentProblem_Consolid && ./build.sh"
    exit 1
fi

# Run consolidation optimization
echo "⚡ Running optimization..."
../AssignmentProblem_Consolid/consolid \\
    --config ./${configName}_config.json \\
    --vehicles ./vehicles.csv \\
    --orders ./orders.csv \\
    --output ./assignments.json

if [ $? -eq 0 ]; then
    echo "✅ Mixed consolidation optimization completed successfully!"
    echo "📁 Results saved to: assignments.json"

    if [ -f "./assignments.json" ]; then
        echo "📊 Summary:"
        echo "   Mock Vehicles: ${consolidationData.metadata.totalVehicles}"
        echo "   TIMOCOM Orders: ${consolidationData.metadata.totalOrders}"
        echo "   Assignments: $(cat ./assignments.json | grep -o '"vehicle_id"' | wc -l)"
    fi
else
    echo "❌ Optimization failed!"
    exit 1
fi
`;

    const scriptPath = path.join(outputDir, 'run_mixed_consolidation.sh');
    fs.writeFileSync(scriptPath, runScript);
    fs.chmodSync(scriptPath, 0o755);
    files.script = scriptPath;

    console.log(`✅ Mixed consolidation export completed to: ${outputDir}`);

    return {
      success: true,
      message: 'Mixed consolidation data exported successfully',
      data: consolidationData,
      files,
      exportDirectory: outputDir,
    };
  } catch (error) {
    console.error('❌ Mixed consolidation export failed:', error);
    return {
      success: false,
      message: `Export failed: ${(error as Error).message}`,
    };
  }
}
