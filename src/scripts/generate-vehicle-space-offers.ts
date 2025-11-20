import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

// Type imports for TypeScript
import type {
  Address,
  ContactPerson,
  LoadingPlace,
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
  const contact: ContactPerson = {
    title: row['contactPerson-title'] || 'Mr',
    firstName: row['contactPerson-firstName'] || 'John',
    lastName: row['contactPerson-lastName'] || 'Doe',
    email: row['contactPerson-email'] || 'john.doe@example.com',
    languages: parseStringArray(row['contactPerson-languages']) || ['en'],
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
  return {
    body: parseStringArray(row['vehicleProperties-body']) || ['standard'],
    type: parseStringArray(row['vehicleProperties-type']) || ['truck'], // exactly one required
    bodyProperty: parseStringArray(row['vehicleProperties-bodyProperty']) || undefined,
    equipment: parseStringArray(row['vehicleProperties-equipment']) || undefined,
    loadSecuring: parseStringArray(row['vehicleProperties-loadSecuring']) || undefined,
    swapBody: parseStringArray(row['vehicleProperties-swapBody']) || undefined,
  };
}

function createAddress(
  objectType: string,
  country: string,
  city: string,
  postalCode?: string,
): Address {
  const address: Address = {
    objectType: objectType || 'address',
    country: country || 'DE',
    city: city || 'Berlin',
  };

  if (postalCode) {
    address.postalCode = postalCode;
  }

  return address;
}

function createLoadingPlaces(row: VehicleCSVRow): LoadingPlace[] {
  const places: LoadingPlace[] = [];

  // Create LOADING place from start location
  const loadingPlace: LoadingPlace = {
    loadingType: 'LOADING',
    address: createAddress(
      row.startObjectType || 'address',
      row.startCountry || 'DE',
      row.startCity || 'Berlin',
      row.startPostalCode,
    ),
    earliestLoadingDate: row.loadingDate || '2025-10-20',
    latestLoadingDate: row.loadingDate || '2025-10-20', // Same date for vehicle space
  };

  places.push(loadingPlace);

  // Create UNLOADING place based on destination area
  const destinationCity = row['destintationArea-Address'] || row.startCity || 'Warsaw';
  // For vehicle space, we create a destination based on the destination area
  const unloadingPlace: LoadingPlace = {
    loadingType: 'UNLOADING',
    address: createAddress(
      'address',
      row.startCountry || 'PL', // Default to PL if not specified
      destinationCity,
      undefined,
    ),
    earliestLoadingDate: row.loadingDate || '2025-10-20',
    latestLoadingDate: row.loadingDate || '2025-10-20',
  };

  places.push(unloadingPlace);

  return places;
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
  const customerId = parseNumber(row['customer-id']);

  const offer: PublishVehicleSpaceOfferRequest = {
    objectType: 'VehicleSpaceOffer',
    customer: { id: customerId || 10000 }, // Required field, use default if missing
    contactPerson: createContactPerson(row),
    vehicleProperties: createVehicleSpaceProperties(row),
    trackable: parseBoolean(row.trackable),
    acceptQuotes: true, // Default to true for vehicle space offers
    loadingPlaces: createLoadingPlaces(row),
  };

  // Add optional properties only if they have values
  const additionalInfo: string[] = [];
  if (row['trailerlength-m']) {
    additionalInfo.push(`Trailer length: ${row['trailerlength-m']}m`);
  }
  if (row['trucklength-m']) {
    additionalInfo.push(`Truck length: ${row['trucklength-m']}m`);
  }
  if (row['trailerWeight-t']) {
    additionalInfo.push(`Trailer weight: ${row['trailerWeight-t']}t`);
  }
  if (row['truckWeight-t']) {
    additionalInfo.push(`Truck weight: ${row['truckWeight-t']}t`);
  }
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

  // Vary trackable and acceptQuotes randomly
  variation.trackable = rand1 > 0.4;
  variation.acceptQuotes = random(seed + 3) > 0.3; // Usually true for vehicle space

  // Vary customer ID slightly
  variation.customer.id = baseOffer.customer.id + Math.floor(rand2 * 10);

  // Vary dates slightly
  const baseDate = new Date(baseOffer.loadingPlaces[0]?.earliestLoadingDate || '2025-10-20');
  const dayOffset = Math.floor(rand3 * 10) - 5; // -5 to +5 days
  const newDate = new Date(baseDate.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  const dateStr = newDate.toISOString().split('T')[0] || '2025-10-20';

  variation.loadingPlaces.forEach((place: LoadingPlace) => {
    place.earliestLoadingDate = dateStr;
    place.latestLoadingDate = dateStr; // Same date for vehicle space
  });

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
