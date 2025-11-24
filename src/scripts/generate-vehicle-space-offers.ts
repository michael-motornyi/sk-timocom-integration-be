import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

// Type imports for TypeScript
import type {
  ContactPerson,
  Money,
  PublishVehicleSpaceOfferRequest,
  VehicleSpaceProperties,
} from '../types/index.js';

interface VehicleCSVRow {
  'customer-id': string;
  'contactPerson-title': string;
  'contactPerson-firstName': string;
  'contactPerson-lastName': string;
  'contactPerson-email': string;
  'contactPerson-languages': string;
  'contactPerson-businessPhone': string;
  'contactPerson-mobilePhone': string;
  'contactPerson-fax': string;
  'vehicleProperties-body': string;
  'vehicleProperties-type': string;
  'vehicleProperties-bodyProperty': string;
  'vehicleProperties-equipment': string;
  'vehicleProperties-loadSecuring': string;
  'vehicleProperties-swapBody': string;
  trackable: string;
  startObjectType: string;
  startCity: string;
  startCountry: string;
  startGeoCoordinate: string;
  startPostalCode: string;
  'destintationArea-Address': string;
  'destintationArea-SizeKm': string;
  loadingDate: string;
  'trailerlength-m': string;
  'trucklength-m': string;
  'trailerWeight-t': string;
  'truckWeight-t': string;
  'closedFreightExchangeSetting-closedFreightExchangeId': string;
  'closedFreightExchangeSetting-publicationType': string;
  'closedFreightExchangeSetting-remark': string;
  'closedFreightExchangeSetting-retentionDurationInMinutes': string;
  'closedFreightExchangeSetting-publicationDateTime': string;
  [key: string]: string;
}

function parseCSV(csvContent: string): VehicleCSVRow[] {
  try {
    const records = parse(csvContent, {
      columns: true, // Use first line as headers
      skip_empty_lines: true,
      trim: true,
      quote: '"',
      delimiter: ',',
      relax_quotes: true,
      skip_records_with_error: true,
    }) as VehicleCSVRow[];

    // Filter out rows with insufficient data
    return records.filter(
      (row) =>
        row['customer-id'] && row['contactPerson-firstName'] && row['vehicleProperties-type'],
    );
  } catch (error) {
    console.error('Error parsing CSV:', error);
    return [];
  }
}

function parseStringArray(value: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function parseBoolean(value: string): boolean {
  return value.toLowerCase() === 'true';
}

function parseNumber(value: string): number {
  const num = Number.parseFloat(value);
  return Number.isNaN(num) ? 0 : num;
}

function createContactPerson(row: VehicleCSVRow): ContactPerson {
  // Map common titles to TIMOCOM-compatible ones
  const titleMapping: Record<string, string> = {
    Dr: 'MR',
    DR: 'MR',
    Ms: 'MRS',
    MS: 'MRS',
    Miss: 'MRS',
    Herr: 'MR',
    Prof: 'MR',
    Professor: 'MR',
  };

  const rawTitle = row['contactPerson-title'] || 'MR';
  const mappedTitle = titleMapping[rawTitle] || rawTitle.toUpperCase();

  const contact: ContactPerson = {
    title: mappedTitle, // Use TIMOCOM-compatible title
    firstName: row['contactPerson-firstName'] || 'John',
    lastName: row['contactPerson-lastName'] || 'Doe',
    email: row['contactPerson-email'] || 'schnittstellen@timocom.com',
    languages: parseStringArray(row['contactPerson-languages']) || ['de'],
    businessPhone: row['contactPerson-businessPhone'] || '+49 211 88 26 88 26', // Always include businessPhone
  };

  if (row['contactPerson-businessPhone']) {
    contact.businessPhone = row['contactPerson-businessPhone'];
  }
  if (row['contactPerson-mobilePhone']) {
    contact.mobilePhone = row['contactPerson-mobilePhone'];
  }
  if (row['contactPerson-fax']) {
    contact.fax = row['contactPerson-fax'];
  }

  return contact;
}

function createVehicleSpaceProperties(row: VehicleCSVRow): VehicleSpaceProperties {
  // Map common body types to TIMOCOM enum values
  const bodyMapping: Record<string, string> = {
    'box van': 'MOVING_FLOOR',
    'flatbed trailer': 'MOVING_FLOOR',
    'refrigerated truck': 'MOVING_FLOOR',
    'tarpaulin truck': 'MOVING_FLOOR',
    'container chassis': 'MOVING_FLOOR',
    'curtain sider': 'MOVING_FLOOR',
    'tank trailer': 'MOVING_FLOOR',
    'low loader': 'MOVING_FLOOR',
    'bulk carrier': 'MOVING_FLOOR',
    'container truck': 'MOVING_FLOOR',
    'tipper truck': 'MOVING_FLOOR',
  };

  // Map common vehicle types to TIMOCOM enum values
  const typeMapping: Record<string, string> = {
    'refrigerated truck': 'VEHICLE_UP_TO_12_T',
    'insulated van': 'VEHICLE_UP_TO_12_T',
    'tarpaulin truck': 'VEHICLE_UP_TO_12_T',
    'flatbed truck': 'VEHICLE_UP_TO_12_T',
    'platform trailer': 'VEHICLE_UP_TO_12_T',
    'tipper truck': 'VEHICLE_UP_TO_12_T',
    'container carrier': 'VEHICLE_UP_TO_12_T',
    'tank truck': 'VEHICLE_UP_TO_12_T',
    'grain truck': 'VEHICLE_UP_TO_12_T',
    'box van': 'VEHICLE_UP_TO_12_T',
    'flatbed trailer': 'VEHICLE_UP_TO_12_T',
    'container chassis': 'VEHICLE_UP_TO_12_T',
    'curtain sider': 'VEHICLE_UP_TO_12_T',
    'tank trailer': 'VEHICLE_UP_TO_12_T',
    'low loader': 'VEHICLE_UP_TO_12_T',
    'bulk carrier': 'VEHICLE_UP_TO_12_T',
    'container truck': 'VEHICLE_UP_TO_12_T',
  };

  const body = parseStringArray(row['vehicleProperties-body']);
  const type = parseStringArray(row['vehicleProperties-type']);

  // Map CSV values to TIMOCOM enums
  const mappedBody =
    body.length > 0 ? body.map((b) => bodyMapping[b] || 'MOVING_FLOOR') : ['MOVING_FLOOR'];
  const mappedType =
    type.length > 0
      ? type.map((t) => typeMapping[t] || 'VEHICLE_UP_TO_12_T')
      : ['VEHICLE_UP_TO_12_T'];

  const properties: VehicleSpaceProperties = {
    body: mappedBody,
    type: mappedType, // exactly one required for vehicle space
  };

  // Only add optional arrays if they have values
  const bodyProperty = parseStringArray(row['vehicleProperties-bodyProperty']);
  if (bodyProperty && bodyProperty.length > 0) {
    properties.bodyProperty = bodyProperty;
  }

  const equipment = parseStringArray(row['vehicleProperties-equipment']);
  if (equipment && equipment.length > 0) {
    properties.equipment = equipment;
  }

  const loadSecuring = parseStringArray(row['vehicleProperties-loadSecuring']);
  if (loadSecuring && loadSecuring.length > 0) {
    properties.loadSecuring = loadSecuring;
  }

  const swapBody = parseStringArray(row['vehicleProperties-swapBody']);
  if (swapBody && swapBody.length > 0) {
    properties.swapBody = swapBody;
  }

  return properties;
}

function _createMoney(amount: string, currency: string): Money | undefined {
  const amountNum = parseNumber(amount);
  if (amountNum <= 0) {
    return undefined;
  }

  return {
    amount: amountNum,
    currency: (currency as Money['currency']) || 'EUR',
  };
}

function convertRowToVehicleSpaceOffer(
  row: VehicleCSVRow,
  _index: number,
): PublishVehicleSpaceOfferRequest {
  // Generate future dates starting tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0] || '2025-11-22';

  const offer: PublishVehicleSpaceOfferRequest = {
    objectType: 'VehicleSpaceOffer',
    customer: { id: 902245 }, // Always use the actual TIMOCOM company ID from environment
    contactPerson: createContactPerson(row),
    vehicleProperties: createVehicleSpaceProperties(row),
    trackable: parseBoolean(row.trackable),
    acceptQuotes: false,

    // Use start/destination/loadingDate structure for vehicle space offers
    start: {
      objectType: 'address',
      city: row.startCity || 'Berlin',
      country: row.startCountry || 'DE',
      ...(row.startPostalCode && { postalCode: row.startPostalCode }),
    },

    destination: {
      area: {
        address: {
          objectType: 'address',
          city: row['destintationArea-Address'] || row.startCity || 'Warsaw',
          country: row.startCountry || 'PL',
        },
        size_km: parseNumber(row['destintationArea-SizeKm']) || 55,
      },
    },

    loadingDate: tomorrowStr,
  };

  // Add vehicle dimensions if available
  if (row['trailerlength-m']) {
    offer.trailerLength_m = parseNumber(row['trailerlength-m']) || 12.31;
  }
  if (row['trucklength-m']) {
    offer.truckLength_m = parseNumber(row['trucklength-m']) || 12.31;
  }
  if (row['trailerWeight-t']) {
    offer.trailerWeight_t = parseNumber(row['trailerWeight-t']) || 5.55;
  }
  if (row['truckWeight-t']) {
    offer.truckWeight_t = parseNumber(row['truckWeight-t']) || 5.55;
  }

  // Add additional information for remaining fields
  const additionalInfo: string[] = [];
  if (row['destintationArea-SizeKm']) {
    additionalInfo.push(`Destination area: ${row['destintationArea-SizeKm']}km radius`);
  }

  if (additionalInfo.length > 0) {
    offer.additionalInformation = additionalInfo;
  }

  if (row['closedFreightExchangeSetting-closedFreightExchangeId']) {
    const setting = {
      closedFreightExchangeId: parseNumber(
        row['closedFreightExchangeSetting-closedFreightExchangeId'],
      ),
      publicationType:
        (row['closedFreightExchangeSetting-publicationType'] as
          | 'INTERNAL_ONLY'
          | 'EXTERNAL_LATER') || 'INTERNAL_ONLY',
    } as {
      closedFreightExchangeId: number;
      publicationType: 'INTERNAL_ONLY' | 'EXTERNAL_LATER';
      remark?: string;
      retentionDurationInMinutes?: number;
      publicationDateTime?: string;
    };

    if (row['closedFreightExchangeSetting-remark']) {
      setting.remark = row['closedFreightExchangeSetting-remark'];
    }
    const retentionDuration = parseNumber(
      row['closedFreightExchangeSetting-retentionDurationInMinutes'],
    );
    if (retentionDuration > 0) {
      setting.retentionDurationInMinutes = retentionDuration;
    }
    if (row['closedFreightExchangeSetting-publicationDateTime']) {
      setting.publicationDateTime = row['closedFreightExchangeSetting-publicationDateTime'];
    }

    offer.closedFreightExchangeSetting = setting;
  }

  return offer;
}

function generateVariation(
  baseOffer: PublishVehicleSpaceOfferRequest,
  index: number,
): PublishVehicleSpaceOfferRequest {
  const variation = JSON.parse(JSON.stringify(baseOffer)) as PublishVehicleSpaceOfferRequest;

  // Add some randomization to create variations
  const random = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const seed = index * 54321;
  const rand1 = random(seed);
  const rand2 = random(seed + 1);
  const rand3 = random(seed + 2);

  // Vary trackable randomly
  variation.trackable = rand1 > 0.4;

  // Vary customer ID slightly
  variation.customer.id = baseOffer.customer.id + Math.floor(rand2 * 10);

  // Vary dates slightly
  const baseDate = new Date(baseOffer.loadingDate || '2025-11-22');
  const dayOffset = Math.floor(rand3 * 30); // 0 to 30 days from base date
  const newDate = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  const dateStr = newDate.toISOString().split('T')[0] || '2025-11-22';

  variation.loadingDate = dateStr;

  return variation;
}

async function generateVehicleSpaceOffers(
  count = 1000,
): Promise<PublishVehicleSpaceOfferRequest[]> {
  try {
    console.log('🚛 Starting vehicle space offers generation...');

    // Read CSV file
    const csvPath = path.join(process.cwd(), 'data', 'vehicle_offers.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    console.log('📄 Parsing CSV data...');
    const csvRows = parseCSV(csvContent);
    console.log(`Found ${csvRows.length} valid rows in CSV`);

    if (csvRows.length === 0) {
      throw new Error('No valid data found in CSV file');
    }

    console.log(`🔄 Generating ${count} vehicle space offers...`);
    const vehicleSpaceOffers: PublishVehicleSpaceOfferRequest[] = [];

    for (let i = 0; i < count; i++) {
      // Use modulo to cycle through available CSV rows
      const csvRowIndex = i % csvRows.length;
      const csvRow = csvRows[csvRowIndex];
      if (!csvRow) {
        continue;
      }

      if (i < csvRows.length) {
        // For the first N offers, use direct conversion from CSV
        vehicleSpaceOffers.push(convertRowToVehicleSpaceOffer(csvRow, i));
      } else {
        // For additional offers, create variations of existing data
        const baseOffer = vehicleSpaceOffers[csvRowIndex];
        if (!baseOffer) {
          continue;
        }
        vehicleSpaceOffers.push(generateVariation(baseOffer, i));
      }

      if ((i + 1) % Math.max(1, Math.floor(count / 10)) === 0 || i + 1 === count) {
        console.log(`Generated ${i + 1}/${count} offers...`);
      }
    }

    console.log(`✅ Successfully generated ${count} vehicle space offers!`);
    console.log(
      `📊 Data size: ${(JSON.stringify(vehicleSpaceOffers).length / 1024 / 1024).toFixed(2)} MB`,
    );

    // Show sample of first offer
    console.log('\n📋 Sample of first generated offer:');
    console.log(JSON.stringify(vehicleSpaceOffers[0], null, 2));

    return vehicleSpaceOffers;
  } catch (error) {
    console.error('❌ Error generating vehicle space offers:', error);
    process.exit(1);
  }
}

// Run the script
if (import.meta.url === `file://${process.argv[1]}`) {
  const count = process.argv[2] ? Number.parseInt(process.argv[2], 10) : 1000;
  if (Number.isNaN(count) || count <= 0) {
    console.error('Invalid count. Please provide a positive number.');
    process.exit(1);
  }
  generateVehicleSpaceOffers(count);
}

export { generateVehicleSpaceOffers };
