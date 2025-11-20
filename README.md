# TIMOCOM Integration

A Node.js SDK and API server for integrating with the TIMOCOM freight exchange platform. This project provides both a programmatic SDK and a REST API server for managing freight offers and vehicle space offers.

## 🚀 Features

- **Complete TIMOCOM Integration** - Full support for freight and vehicle space offers
- **REST API Server** - Express.js server with comprehensive endpoints
- **Bulk Operations** - Efficient batch processing with retry logic
- **Data Generation** - Automated freight and vehicle offer generation from CSV data
- **Type Safety** - Full TypeScript support with comprehensive type definitions
- **Code Quality** - ESLint, Prettier, and automated formatting with lint-staged
- **Conventional Commits** - Enforced commit message standards with commitlint

## 📦 Installation

```bash
# Clone the repository
git clone <repository-url>
cd timocom-integration

# Install dependencies
npm install

# Copy environment template
cp .env.example .env
```

## 🔧 Configuration

Create a `.env` file with your TIMOCOM credentials:

```env
# TIMOCOM API Credentials
TIMOCOM_USERNAME=your_username
TIMOCOM_PASSWORD=your_password
TIMOCOM_ID=your_company_id

# Optional Configuration
TIMOCOM_ENV=production  # or 'sandbox'
TIMOCOM_TIMEOUT_MS=15000
PORT=3000
```

## 🏃‍♂️ Quick Start

### Start the API Server

```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

The server will be available at:
- **API Base:** `http://localhost:3000/api`
- **Documentation:** `http://localhost:3000/api/docs`
- **Health Check:** `http://localhost:3000/health`

### Using the SDK Programmatically

```typescript
import { createTimocomApi } from './src/timocom-client.js';

// Initialize the client
const timocom = createTimocomApi({
  username: 'your_username',
  password: 'your_password',
  companyId: 'your_company_id'
});

// Get freight offers
const offers = await timocom.getMyFreightOffers({ limit: 10 });

// Create a new freight offer
const newOffer = await timocom.createFreightOffer({
  objectType: 'freightOffer',
  customerId: 'your_customer_id',
  // ... other offer data
});
```

## 📚 API Endpoints

### TIMOCOM Freight Offers

```http
GET    /api/timocom/test                           # Test connection
GET    /api/timocom/freight-offers                 # List freight offers
GET    /api/timocom/freight-offers/:id             # Get specific offer
POST   /api/timocom/freight-offers                 # Create new offer
DELETE /api/timocom/freight-offers/:id             # Delete offer
POST   /api/timocom/freight-offers/bulk            # Bulk create offers
POST   /api/timocom/freight-offers/delete-all      # Delete all offers
```

### TIMOCOM Vehicle Space Offers

```http
GET    /api/timocom/vehicle-space-offers           # List vehicle offers
GET    /api/timocom/vehicle-space-offers/:id       # Get specific offer
POST   /api/timocom/vehicle-space-offers           # Create new offer
DELETE /api/timocom/vehicle-space-offers/:id       # Delete offer
POST   /api/timocom/vehicle-space-offers/bulk      # Bulk create offers
POST   /api/timocom/vehicle-space-offers/delete-all # Delete all offers
```

## 🛠️ Available Scripts

### Development

```bash
npm run dev              # Start development server with auto-reload
npm start               # Start production server
```

### Code Quality

```bash
npm run lint            # Run linter
npm run lint:fix        # Fix linting issues
npm run format          # Format code
npm run check           # Check code quality and formatting
npm run check:fix       # Fix all code quality issues
npm run commitlint      # Validate commit messages
```

## 📁 Project Structure

```
timocom-integration/
├── src/
│   ├── api/
│   │   └── routes/
│   │       └── timocom/
│   │           ├── common.ts           # Shared utilities
│   │           ├── freight-offers.ts   # Freight offer routes
│   │           └── vehicle-space-offers.ts # Vehicle space routes
│   ├── scripts/
│   │   ├── generate-freight-offers.ts  # Freight data generation
│   │   └── generate-vehicle-space-offers.ts # Vehicle data generation
│   ├── types/
│   │   ├── freight.ts                  # Type definitions
│   │   └── index.ts                    # Type exports
│   ├── utils/
│   │   └── error-handler.ts           # Error handling utilities
│   ├── timocom-client.ts              # Main SDK client
│   └── server.ts                      # Express server
├── data/                               # CSV data files
├── examples/                           # Usage examples
├── .husky/                            # Git hooks
├── commitlint.config.js               # Commit linting config
├── biome.json                         # Code formatting config
└── COMMIT_CONVENTION.md               # Commit guidelines
```

## 🔒 Error Handling

The SDK provides comprehensive error handling:

- **HTTP Status Codes** - Proper REST status codes
- **Detailed Error Messages** - Clear, actionable error descriptions
- **TIMOCOM API Errors** - Mapped and enhanced TIMOCOM API responses
- **Retry Logic** - Automatic retries for transient failures
- **Logging** - Comprehensive logging for debugging

## 📝 Development Workflow

This project uses modern development practices:

### Git Hooks (Husky)
- **Pre-commit:** Runs lint-staged for code quality
- **Commit-msg:** Validates conventional commit messages

### Code Quality
- **Biome:** Fast linting and formatting
- **TypeScript:** Full type safety
- **lint-staged:** Only lint changed files

### Commit Standards
Follow conventional commits (see [COMMIT_CONVENTION.md](./COMMIT_CONVENTION.md)):

```bash
feat: add new feature
fix: resolve bug
docs: update documentation
refactor: improve code structure
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `TIMOCOM_USERNAME` | TIMOCOM API username | Required |
| `TIMOCOM_PASSWORD` | TIMOCOM API password | Required |
| `TIMOCOM_ID` | TIMOCOM company ID | Required |
| `TIMOCOM_ENV` | Environment (production/sandbox) | `production` |
| `TIMOCOM_TIMEOUT_MS` | API request timeout | `15000` |
| `PORT` | Server port | `3000` |

## 🧪 Testing

```bash
# Test TIMOCOM connection
curl http://localhost:3000/api/timocom/test

# Test commit message format
echo "feat: your message" | npx commitlint

# Validate code quality
npm run check
```

## 📖 API Documentation

When the server is running, visit `http://localhost:3000/api/docs` for interactive API documentation.

## 🆘 Support

- Check the [COMMIT_CONVENTION.md](./COMMIT_CONVENTION.md) for commit guidelines
- Review the `examples/` directory for usage patterns
- Use `npm run check` to validate code quality
- Test API endpoints at `http://localhost:3000/api/docs`

---

**Built with ❤️ for the logistics industry**
