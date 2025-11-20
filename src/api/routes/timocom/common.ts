import type { NextFunction, Request, Response } from 'express';
import { createTimocomApi } from '../../../timocom-client.js';
import { getErrorMessage } from '../../../utils/error-handler.js';

// TIMOCOM client instance (uses environment variables for credentials)
export const createTimocomClient = () => {
  try {
    return createTimocomApi();
  } catch (error: unknown) {
    throw new Error(`Failed to initialize TIMOCOM client: ${getErrorMessage(error)}`);
  }
};

// Middleware to check if TIMOCOM credentials are configured
export const requireTimocomConfig = (_req: Request, res: Response, next: NextFunction) => {
  // Check environment variables directly without creating a client
  const username = process.env.TIMOCOM_USERNAME;
  const password = process.env.TIMOCOM_PASSWORD;
  const _companyId = process.env.TIMOCOM_ID;

  if (!username || !password) {
    return res.status(500).json({
      success: false,
      error: 'TIMOCOM configuration error: Missing credentials',
      hint: 'Please check your .env file contains TIMOCOM_USERNAME, TIMOCOM_PASSWORD, and TIMOCOM_ID',
    });
  }

  next();
};
