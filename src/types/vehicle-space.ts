import type { ContactPerson, CustomerRef, Money, TimocomEnvelope } from './freight.js';

export type VehicleSpaceProperties = {
  body: string[];
  /** Vehicle space: exactly one value is required */
  type: string[];
  /** Optional arrays */
  bodyProperty?: string[];
  equipment?: string[];
  loadSecuring?: string[];
  swapBody?: string[];
};

export type PublishVehicleSpaceOfferRequest = {
  objectType?: string; // Optional - may be inferred from endpoint
  customer: CustomerRef; // { id: timocomId }
  contactPerson: ContactPerson;
  vehicleProperties: VehicleSpaceProperties;
  trackable?: boolean; // per spec
  acceptQuotes?: boolean; // per spec

  // Vehicle space offers use start/destination/loadingDate instead of loadingPlaces
  start: {
    objectType?: string;
    city: string;
    country: string;
    postalCode?: string;
    geoCoordinate?: {
      longitude: number;
      latitude: number;
    };
    geocoded?: boolean;
    streetOrPostbox?: string;
  };

  destination?: {
    objectType?: string;
    area?: {
      address: {
        objectType?: string;
        city: string;
        country: string;
        postalCode?: string;
        geoCoordinate?: {
          longitude: number;
          latitude: number;
        };
        geocoded?: boolean;
        streetOrPostbox?: string;
      };
      size_km: number;
    };
  };

  loadingDate: string; // YYYY-MM-DD format

  // Vehicle dimensions
  trailerLength_m?: number;
  truckLength_m?: number;
  trailerWeight_t?: number;
  truckWeight_t?: number;

  price?: Money;
  paymentDueWithinDays?: number; // 0..999
  additionalInformation?: string[];
  publicRemark?: string; // <= 500
  internalRemark?: string; // <= 50
  logisticsDocumentTypes?: string[];
  excludedCustomers?: number[];

  closedFreightExchangeSetting?: {
    closedFreightExchangeId: number;
    publicationType: 'INTERNAL_ONLY' | 'EXTERNAL_LATER';
    remark?: string;
    retentionDurationInMinutes?: number;
    publicationDateTime?: string; // server-calculated
  };
};

export type VehicleSpaceOfferSummary = {
  id: string; // public offer id
  [k: string]: unknown;
};

export type PublishVehicleSpaceOfferResponse = TimocomEnvelope<{ id: string }>;

export type GetMyVehicleSpaceOfferResponse = TimocomEnvelope<VehicleSpaceOfferSummary>;

export type ListMyVehicleSpaceOffersResponse = TimocomEnvelope<VehicleSpaceOfferSummary[]>;

export type WithdrawVehicleSpaceParams = {
  timocom_id: number;
  /** Optional: name can differ per tenant; pass only if you know it */
  accepted_quote_id?: string;
};
