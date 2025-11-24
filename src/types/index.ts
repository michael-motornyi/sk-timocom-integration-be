// Main types export - Re-exports all types for easy importing

// Freight offer types
export type {
  Address,
  ContactPerson,
  // Legacy aliases
  CreateFreightOfferRequest,
  CustomerRef,
  GetFreightOffersRequest,
  GetFreightOffersResponse,
  GetMyFreightOfferResponse,
  ListMyFreightOffersResponse,
  LoadingPlace,
  LoadingType,
  Money,
  MyFreightOfferPayload,
  // Request/Response types
  PublishFreightOfferRequest,
  PublishFreightOfferResponse,
  PublishFreightOfferResponsePayload,
  TimocomApiResponse,
  // Configuration
  TimocomConfig,
  TimocomEnvelope,
  TimocomEnvironmentConfig,
  // Main interfaces
  TimocomFreightOffer,
  TimocomFreightOffersList,
  // Core TIMOCOM types
  TimocomMeta,
  VehicleProperties,
  WithdrawOwnParams,
} from './freight.js';

// Vehicle Space Offer types
export type {
  GetMyVehicleSpaceOfferResponse,
  ListMyVehicleSpaceOffersResponse,
  PublishVehicleSpaceOfferRequest,
  PublishVehicleSpaceOfferResponse,
  VehicleSpaceOfferSummary,
  VehicleSpaceProperties,
  WithdrawVehicleSpaceParams,
} from './vehicle-space.js';
