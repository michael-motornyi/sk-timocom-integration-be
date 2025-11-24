// TIMOCOM API Types - Complete type definitions

export type TimocomMeta = {
  requestId?: string;
  responseTimestamp?: string;
  [k: string]: unknown;
};

export type TimocomEnvelope<T> = {
  objectType?: string;
  meta?: TimocomMeta;
  payload: T;
};

export type Money = {
  amount: number; // >= 0.01, 2 decimals
  currency:
    | 'ALL'
    | 'AMD'
    | 'AZN'
    | 'BAM'
    | 'BGN'
    | 'BYN'
    | 'CHF'
    | 'CZK'
    | 'DKK'
    | 'EUR'
    | 'GBP'
    | 'GEL'
    | 'HRK'
    | 'HUF'
    | 'ISK'
    | 'KZT'
    | 'MDL'
    | 'MKD'
    | 'NOK'
    | 'PLN'
    | 'RON'
    | 'RSD'
    | 'RUB'
    | 'SEK'
    | 'TRY'
    | 'UAH'
    | 'USD';
};

export type Address = {
  objectType: string;
  country: string; // ISO-3166-1 alpha-2
  city: string;
  postalCode?: string;
  street?: string;
  houseNumber?: string;
  latitude?: number;
  longitude?: number;
};

export type LoadingType = 'LOADING' | 'UNLOADING';

export type LoadingPlace = {
  loadingType: LoadingType;
  address: Address;
  /** HH:mm */
  startTime?: string;
  /** HH:mm */
  endTime?: string;
  /** YYYY-MM-DD */
  earliestLoadingDate: string;
  /** YYYY-MM-DD */
  latestLoadingDate: string;
  /** Legacy support */
  earliestLoadingTime?: string;
  latestLoadingTime?: string;
};

export type ContactPerson = {
  title: string; // e.g. MR | MRS
  firstName: string;
  lastName: string;
  email: string;
  languages: string[]; // ISO-639
  businessPhone?: string;
  mobilePhone?: string;
  fax?: string;
};

export type CustomerRef = {
  /** TIMOCOM customer ID (required for publish) */
  id: number;
};

export type VehicleProperties = {
  body: string[];
  /** Optional arrays */
  bodyProperty?: string[];
  equipment?: string[];
  loadSecuring?: string[];
  swapBody?: string[];
  /** For freight: at least one; for vehicle space: exactly one */
  type: string[];
};

export type GetFreightOffersRequest = {
  ids: string[];
};

export type FreightOffer = {
  id: string;
};
export type GetFreightOffersResponse = {
  offers: FreightOffer[];
};

export type PublishFreightOfferRequest = {
  objectType: string;
  customer?: CustomerRef;
  contactPerson: ContactPerson;
  vehicleProperties: VehicleProperties;
  /** True/false per spec */
  trackable: boolean;
  /** True/false per spec */
  acceptQuotes: boolean;

  freightDescription: string; // 3..50 chars
  length_m: number; // 0..99.99, step 0.01
  weight_t: number; // 0..99.99, step 0.01
  loadingPlaces: LoadingPlace[]; // LOADING first, UNLOADING last

  /** Optional fields */
  price?: Money;
  paymentDueWithinDays?: number; // 0..999
  additionalInformation?: string[];
  publicRemark?: string; // <=500
  internalRemark?: string; // <=50
  logisticsDocumentTypes?: string[];

  /** Closed Freight Exchange settings (optional) */
  closedFreightExchangeSetting?: {
    closedFreightExchangeId: number;
    publicationType: 'INTERNAL_ONLY' | 'EXTERNAL_LATER';
    remark?: string; // <=150
    retentionDurationInMinutes?: number;
    publicationDateTime?: string;
  };
};

export type PublishFreightOfferResponsePayload = {
  id: string;
  [k: string]: unknown;
};
export type PublishFreightOfferResponse = TimocomEnvelope<PublishFreightOfferResponsePayload>;

export type MyFreightOfferPayload = {
  id: string;
  [k: string]: unknown;
};
export type GetMyFreightOfferResponse = TimocomEnvelope<MyFreightOfferPayload>;

export type ListMyFreightOffersResponse = TimocomEnvelope<MyFreightOfferPayload[]>;

/** Withdraw (DELETE) returns 204 No Content — we don't expect a body. */
export type WithdrawOwnParams = {
  timocom_id: number;
  accepted_freight_quote_id?: string;
};

// Configuration interfaces
export interface TimocomConfig {
  username?: string;
  password?: string;
  apiKey?: string;
  baseUrl?: string;
  timeout?: number;
  environment?: 'sandbox' | 'production';
  companyId?: string;
}

export interface TimocomEnvironmentConfig {
  username: string;
  password: string;
  environment: 'sandbox' | 'production';
  companyId: string;
  timeout: number;
}

// Main freight offer interfaces
export interface TimocomFreightOffer {
  id: string; // Updated to match API response
  publicOfferId?: string; // Legacy support
  customerId?: number;
  customer?: CustomerRef;
  contactPerson: ContactPerson;
  vehicleProperties: VehicleProperties;
  trackable: boolean;
  acceptQuotes: boolean;
  freightDescription: string;
  length_m: number;
  width_m?: number;
  height_m?: number;
  weight_t: number;
  volume_m3?: number;
  loadingPlaces: LoadingPlace[];
  unloadingPlaces?: LoadingPlace[];
  additionalInformation?: string[];
  publicRemark?: string;
  internalRemark?: string;
  logisticsDocumentTypes?: string[];
  validUntil?: string;
  price?: Money;
  paymentDueWithinDays?: number;
  status?: 'active' | 'inactive' | 'expired' | 'completed';
  createdAt?: string;
  updatedAt?: string;
  closedFreightExchangeSetting?: {
    closedFreightExchangeId: number;
    publicationType: 'INTERNAL_ONLY' | 'EXTERNAL_LATER';
    remark?: string;
    retentionDurationInMinutes?: number;
    publicationDateTime?: string;
  };
}

// SDK Response wrapper
export interface TimocomApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
  timestamp: string;
}

export interface TimocomFreightOffersList {
  offers: TimocomFreightOffer[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

// Legacy aliases for backward compatibility
export interface CreateFreightOfferRequest extends PublishFreightOfferRequest {}

// ============================================================================
// VEHICLE SPACE OFFER TYPES
// ============================================================================
// Vehicle Space Offer types moved to vehicle-space.ts to avoid conflicts
