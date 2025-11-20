import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

// Type imports for TypeScript
import type {
  Address,
  ContactPerson,
  LoadingPlace,
  Money,
  PublishFreightOfferRequest,
  VehicleProperties,
} from '../types/index.js';

interface CSVRow {
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
  acceptQuotes: string;
  freightDescription: string;
  length_m: string;
  weight_t: string;
  'price-amount': string;
  'price-currency': string;
  paymentDueWithinDays: string;
  additionalInformation: string;
  publicRemark: string;
  internalRemark: string;
  logisticsDocumentTypes: string;
  'closedFreightExchangeSetting-closedFreightExchangeId': string;
  'closedFreightExchangeSetting-publicationType': string;
  'closedFreightExchangeSetting-remark': string;
  'closedFreightExchangeSetting-retentionDurationInMinutes': string;
  'closedFreightExchangeSetting-publicationDateTime': string;
  'loadingPlaces-loadingType': string;
  'loadingPlaces-earliestLoadingDate': string;
  'loadingPlaces-latestLoadingDate': string;
  'loadingPlaces-startTime': string;
  'loadingPlaces-endTime': string;
  'loadingPlaces-address-objectType': string;
  'loadingPlaces-address-country': string;
  'loadingPlaces-address-city': string;
  'loadingPlaces-address-postalCode': string;
  'loadingPlaces-address-geoCoordinate-longitude': string;
  'loadingPlaces-address-geoCoordinate-latitude': string;
  [key: string]: string;
}

function parseCSV(csvContent: string): CSVRow[] {
  try {
    const records = parse(csvContent, {
      columns: true, // Use first line as headers
      skip_empty_lines: true,
      trim: true,
      quote: '"',
      delimiter: ',',
      relax_quotes: true,
      skip_records_with_error: true,
    }) as CSVRow[];

    // Filter out rows with insufficient data
    return records.filter(
      (row) => row['customer-id'] && row['contactPerson-firstName'] && row.freightDescription,
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

function createContactPerson(row: CSVRow): ContactPerson {
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
    firstName: row['contactPerson-firstName'] || 'Fernández',
    lastName: row['contactPerson-lastName'] || 'Hernández',
    email: row['contactPerson-email'] || 'schnittstellen@timocom.com',
    languages: parseStringArray(row['contactPerson-languages']) || ['de'],
    businessPhone: row['contactPerson-businessPhone'] || '+49 211 88 26 88 26', // Always include businessPhone
  };

  if (row['contactPerson-mobilePhone']) {
    contact.mobilePhone = row['contactPerson-mobilePhone'];
  }
  if (row['contactPerson-fax']) {
    contact.fax = row['contactPerson-fax'];
  }

  return contact;
}

function createVehicleProperties(row: CSVRow): VehicleProperties {
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

  return {
    body: mappedBody,
    bodyProperty: parseStringArray(row['vehicleProperties-bodyProperty']) || undefined,
    equipment: parseStringArray(row['vehicleProperties-equipment']) || undefined,
    loadSecuring: parseStringArray(row['vehicleProperties-loadSecuring']) || undefined,
    swapBody: parseStringArray(row['vehicleProperties-swapBody']) || undefined,
    type: mappedType,
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

function createLoadingPlaces(row: CSVRow): LoadingPlace[] {
  const places: LoadingPlace[] = [];

  // Generate future dates starting tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(tomorrow);
  dayAfter.setDate(dayAfter.getDate() + 1);

  const tomorrowStr = tomorrow.toISOString().split('T')[0] || '2025-11-21';
  const dayAfterStr = dayAfter.toISOString().split('T')[0] || '2025-11-22';

  // The CSV has all column names, including duplicates
  // We need to get the values by their position, not just by key name
  const allKeys = Object.keys(row);
  const allValues = Object.values(row);

  // Find the first occurrence of loadingPlaces-loadingType (around index 32)
  const firstTypeIndex = allKeys.indexOf('loadingPlaces-loadingType');
  if (firstTypeIndex !== -1 && allValues[firstTypeIndex]) {
    const loadingType = allValues[firstTypeIndex] as 'LOADING' | 'UNLOADING';
    const place: LoadingPlace = {
      loadingType: loadingType,
      address: createAddress(
        allValues[firstTypeIndex + 5] as string, // loadingPlaces-address-objectType
        allValues[firstTypeIndex + 6] as string, // loadingPlaces-address-country
        allValues[firstTypeIndex + 7] as string, // loadingPlaces-address-city
        allValues[firstTypeIndex + 8] as string, // loadingPlaces-address-postalCode
      ),
      // Use future dates instead of CSV dates
      earliestLoadingDate: loadingType === 'LOADING' ? tomorrowStr : dayAfterStr,
      latestLoadingDate: loadingType === 'LOADING' ? tomorrowStr : dayAfterStr,
    };

    if (allValues[firstTypeIndex + 3]) {
      place.startTime = allValues[firstTypeIndex + 3] as string;
    }
    if (allValues[firstTypeIndex + 4]) {
      place.endTime = allValues[firstTypeIndex + 4] as string;
    }

    places.push(place);
  }

  // Find the second occurrence of loadingPlaces-loadingType
  const secondTypeIndex = allKeys.lastIndexOf('loadingPlaces-loadingType');
  if (secondTypeIndex !== -1 && secondTypeIndex !== firstTypeIndex && allValues[secondTypeIndex]) {
    const secondLoadingType = allValues[secondTypeIndex] as 'LOADING' | 'UNLOADING';
    const place: LoadingPlace = {
      loadingType: secondLoadingType,
      address: createAddress(
        allValues[secondTypeIndex + 5] as string, // second loadingPlaces-address-objectType
        allValues[secondTypeIndex + 6] as string, // second loadingPlaces-address-country
        allValues[secondTypeIndex + 7] as string, // second loadingPlaces-address-city
        allValues[secondTypeIndex + 8] as string, // second loadingPlaces-address-postalCode
      ),
      // Use future dates instead of CSV dates
      earliestLoadingDate: secondLoadingType === 'LOADING' ? tomorrowStr : dayAfterStr,
      latestLoadingDate: secondLoadingType === 'LOADING' ? tomorrowStr : dayAfterStr,
    };

    if (allValues[secondTypeIndex + 3]) {
      place.startTime = allValues[secondTypeIndex + 3] as string;
    }
    if (allValues[secondTypeIndex + 4]) {
      place.endTime = allValues[secondTypeIndex + 4] as string;
    }

    places.push(place);
  }

  // Fallback: ensure we have at least loading and unloading places
  if (places.length === 0) {
    places.push({
      loadingType: 'LOADING',
      address: createAddress('address', 'DE', 'Berlin'),
      earliestLoadingDate: tomorrowStr,
      latestLoadingDate: tomorrowStr,
    });
    places.push({
      loadingType: 'UNLOADING',
      address: createAddress('address', 'PL', 'Warsaw'),
      earliestLoadingDate: dayAfterStr,
      latestLoadingDate: dayAfterStr,
    });
  } else if (places.length === 1) {
    // Add missing type
    const hasLoading = places.some((p) => p.loadingType === 'LOADING');
    if (hasLoading) {
      places.push({
        loadingType: 'UNLOADING',
        address: createAddress('address', 'PL', 'Warsaw'),
        earliestLoadingDate: dayAfterStr,
        latestLoadingDate: dayAfterStr,
      });
    } else {
      places.unshift({
        loadingType: 'LOADING',
        address: createAddress('address', 'DE', 'Berlin'),
        earliestLoadingDate: tomorrowStr,
        latestLoadingDate: tomorrowStr,
      });
    }
  }

  return places;
}

function createMoney(amount: string, currency: string): Money | undefined {
  const amountNum = parseNumber(amount);
  if (amountNum <= 0) {
    return undefined;
  }

  return {
    amount: amountNum,
    currency: (currency as Money['currency']) || 'EUR',
  };
}

function convertRowToFreightOffer(row: CSVRow, index: number): PublishFreightOfferRequest {
  const offer: PublishFreightOfferRequest = {
    customer: { id: 902245 }, // Always use the actual TIMOCOM company ID from environment
    objectType: 'freightOffer', // Lowercase 'f' as required by TIMOCOM
    contactPerson: createContactPerson(row),
    vehicleProperties: createVehicleProperties(row),
    trackable: parseBoolean(row.trackable),
    acceptQuotes: parseBoolean(row.acceptQuotes),
    freightDescription: row.freightDescription || `SDK generated freight ${index + 1}`,
    length_m: parseNumber(row.length_m) || 12.31,
    weight_t: parseNumber(row.weight_t) || 5.55,
    loadingPlaces: createLoadingPlaces(row),
  };

  // Add optional properties only if they have values

  const price = createMoney(row['price-amount'], row['price-currency']);
  if (price) {
    offer.price = price;
  }

  const paymentDays = parseNumber(row.paymentDueWithinDays);
  if (paymentDays > 0) {
    offer.paymentDueWithinDays = paymentDays;
  }

  const additionalInfo = parseStringArray(row.additionalInformation);
  if (additionalInfo.length > 0) {
    offer.additionalInformation = additionalInfo;
  }

  if (row.publicRemark) {
    offer.publicRemark = row.publicRemark;
  }

  if (row.internalRemark) {
    offer.internalRemark = row.internalRemark;
  }

  const logisticsTypes = parseStringArray(row.logisticsDocumentTypes);
  if (logisticsTypes.length > 0) {
    offer.logisticsDocumentTypes = logisticsTypes;
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
  baseOffer: PublishFreightOfferRequest,
  index: number,
): PublishFreightOfferRequest {
  const variation = JSON.parse(JSON.stringify(baseOffer)) as PublishFreightOfferRequest;

  // Add some randomization to create variations
  const random = (seed: number) => {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  };

  const seed = index * 12345;
  const rand1 = random(seed);
  const rand2 = random(seed + 1);
  const rand3 = random(seed + 2);

  // Vary weight and length slightly
  variation.weight_t = Math.max(0.01, baseOffer.weight_t * (0.8 + rand1 * 0.4));
  variation.length_m = Math.max(0.01, baseOffer.length_m * (0.8 + rand2 * 0.4));

  // Vary trackable and acceptQuotes randomly
  variation.trackable = rand3 > 0.5;
  variation.acceptQuotes = random(seed + 3) > 0.6;

  // Update description with index
  variation.freightDescription = `SDK generated freight ${index}`;

  // Ensure correct TIMOCOM format
  variation.objectType = 'freightOffer'; // Ensure lowercase 'f'
  variation.customer = { id: variation.customer?.id || 902245 }; // Ensure customer ID is always present

  // Use future dates starting tomorrow
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayOffset = Math.floor(rand1 * 30); // 0 to 30 days from tomorrow
  const loadingDate = new Date(tomorrow.getTime() + dayOffset * 24 * 60 * 60 * 1000);
  const unloadingDate = new Date(loadingDate.getTime() + 24 * 60 * 60 * 1000); // Next day

  variation.loadingPlaces.forEach((place: LoadingPlace) => {
    if (place.loadingType === 'LOADING') {
      place.earliestLoadingDate = loadingDate.toISOString().split('T')[0] || '2025-11-21';
      place.latestLoadingDate = loadingDate.toISOString().split('T')[0] || '2025-11-21';
    } else {
      place.earliestLoadingDate = unloadingDate.toISOString().split('T')[0] || '2025-11-22';
      place.latestLoadingDate = unloadingDate.toISOString().split('T')[0] || '2025-11-22';
    }
  });

  return variation;
}

async function generateFreightOffers(count = 1000): Promise<PublishFreightOfferRequest[]> {
  try {
    console.log(`🚚 Starting freight offers generation (${count} items)...`);

    // Read CSV file
    const csvPath = path.join(process.cwd(), 'data', 'freight_offers.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');

    console.log('📄 Parsing CSV data...');
    const csvRows = parseCSV(csvContent);
    console.log(`Found ${csvRows.length} valid rows in CSV`);

    if (csvRows.length === 0) {
      throw new Error('No valid data found in CSV file');
    }

    console.log(`🔄 Generating ${count} freight offers...`);
    const freightOffers: PublishFreightOfferRequest[] = [];

    for (let i = 0; i < count; i++) {
      // Use modulo to cycle through available CSV rows
      const csvRowIndex = i % csvRows.length;
      const csvRow = csvRows[csvRowIndex];
      if (!csvRow) {
        continue;
      }

      if (i < csvRows.length) {
        // For the first N offers, use direct conversion from CSV
        freightOffers.push(convertRowToFreightOffer(csvRow, i));
      } else {
        // For additional offers, create variations of existing data
        const baseOffer = freightOffers[csvRowIndex];
        if (!baseOffer) {
          continue;
        }
        freightOffers.push(generateVariation(baseOffer, i));
      }

      if ((i + 1) % Math.max(1, Math.floor(count / 10)) === 0 || i + 1 === count) {
        console.log(`Generated ${i + 1}/${count} offers...`);
      }
    }

    console.log(`✅ Successfully generated ${count} freight offers!`);
    console.log(
      `📊 Data size: ${(JSON.stringify(freightOffers).length / 1024 / 1024).toFixed(2)} MB`,
    );

    // Show sample of first offer
    console.log('\n📋 Sample of first generated offer:');
    console.log(JSON.stringify(freightOffers[0], null, 2));

    return freightOffers;
  } catch (error) {
    console.error('❌ Error generating freight offers:', error);
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
  generateFreightOffers(count);
}

export { generateFreightOffers };
