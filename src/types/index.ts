// Main types export - Re-exports all types for easy importing

// You can also add specific grouped exports if needed
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
  // Vehicle Space Offer types
  PublishVehicleSpaceOfferRequest,
  PublishVehicleSpaceOfferResponse,
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
  VehicleSpaceProperties,
  WithdrawOwnParams,
} from './freight.js';
export * from './freight.js';
