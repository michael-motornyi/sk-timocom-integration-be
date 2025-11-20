import path from 'node:path';
import express, { type Request, type Response } from 'express';
import fs from 'fs-extra';
import { handleRouteError } from '../../utils/error-handler.js';
import { upload } from '../middleware/upload.js';

const router = express.Router();

// Upload CSV file endpoint
router.post('/upload/:type', upload.single('csvFile'), (req: Request, res: Response) => {
  try {
    const type = req.params.type;
    const file = (req as Request & { file?: Express.Multer.File }).file;

    if (!file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded',
      });
    }

    // Validate file type
    if (type !== 'freight' && type !== 'vehicle') {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Use "freight" or "vehicle"',
      });
    }

    // Use standardized filenames regardless of upload name
    const standardFilenames = {
      freight: 'freight_offers.csv',
      vehicle: 'vehicle_offers.csv',
    };

    const standardFilename = standardFilenames[type as keyof typeof standardFilenames];

    // Validate CSV content (basic check)
    const content = fs.readFileSync(file.path, 'utf-8');
    const lines = content.split('\n');

    if (lines.length < 2) {
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: 'CSV file must contain at least a header and one data row',
      });
    }

    // Basic column validation
    const headers = lines[0]?.toLowerCase() || '';
    const requiredHeaders =
      type === 'freight'
        ? ['customer-id', 'contactperson-firstname', 'freightdescription']
        : ['customer-id', 'contactperson-firstname', 'vehicleproperties-type'];

    const missingHeaders = requiredHeaders.filter(
      (header) => !headers.includes(header.toLowerCase()),
    );

    if (missingHeaders.length > 0) {
      fs.unlinkSync(file.path);
      return res.status(400).json({
        success: false,
        error: `Missing required columns: ${missingHeaders.join(', ')}`,
      });
    }

    // Define the destination path with standard filename
    const destinationPath = path.join(__dirname, '..', '..', '..', 'data', standardFilename);

    // Create backup of existing file if it exists
    if (fs.existsSync(destinationPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = `${standardFilename.replace('.csv', '')}_backup_${timestamp}.csv`;
      const backupPath = path.join(__dirname, '..', '..', '..', 'data', backupName);
      fs.copyFileSync(destinationPath, backupPath);
    }

    // Move uploaded file to destination with standard name
    fs.moveSync(file.path, destinationPath);

    const stats = fs.statSync(destinationPath);

    res.json({
      success: true,
      message: `${type.charAt(0).toUpperCase() + type.slice(1)} CSV file uploaded successfully`,
      file: {
        name: file.originalname,
        size: stats.size,
        sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
        type: type,
        uploaded: new Date().toISOString(),
        rows: lines.length - 1, // Subtract header
      },
    });
  } catch (error: unknown) {
    // Clean up file if there was an error
    const requestWithFile = req as Request & { file?: Express.Multer.File };
    if (requestWithFile.file) {
      try {
        fs.unlinkSync(requestWithFile.file.path);
      } catch (_e) {
        // Ignore cleanup errors
      }
    }

    res.status(500).json(handleRouteError(error, 'POST /csv/upload', 'Upload failed'));
  }
});

// Get CSV file info and validation
router.get('/info/:type', (req: Request, res: Response) => {
  try {
    const type = req.params.type;

    if (type !== 'freight' && type !== 'vehicle') {
      return res.status(400).json({
        success: false,
        error: 'Invalid type. Use "freight" or "vehicle"',
      });
    }

    const filenames = {
      freight: 'freight_offers.csv',
      vehicle: 'vehicle_offers.csv',
    };

    const filename = filenames[type as keyof typeof filenames];
    const filePath = path.join(process.cwd(), 'data', filename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({
        success: false,
        error: `${type.charAt(0).toUpperCase() + type.slice(1)} CSV file not found`,
      });
    }

    const stats = fs.statSync(filePath);
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n').filter((line: string) => line.trim());
    const headers = lines[0] ? lines[0].split(',').slice(0, 10) : []; // Show first 10 headers

    res.json({
      success: true,
      file: {
        name: filename,
        size: stats.size,
        sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
        type: type,
        modified: stats.mtime.toISOString(),
        rows: lines.length - 1,
        columns: lines[0] ? lines[0].split(',').length : 0,
        headers: headers.map((h: string) => h.replace(/"/g, '').trim()),
      },
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// List backup files
router.get('/backups', (_req: Request, res: Response) => {
  try {
    const dataDir = path.join(process.cwd(), 'data');
    const files = fs
      .readdirSync(dataDir)
      .filter((file: string) => file.includes('_backup_') && file.endsWith('.csv'))
      .map((file: string) => {
        const filePath = path.join(dataDir, file);
        const stats = fs.statSync(filePath);
        const type = file.includes('freight') ? 'freight' : 'vehicle';
        return {
          name: file,
          size: stats.size,
          sizeFormatted: `${(stats.size / 1024).toFixed(2)} KB`,
          created: stats.mtime.toISOString(),
          type: type,
        };
      })
      .sort(
        (a: { created: string }, b: { created: string }) =>
          new Date(b.created).getTime() - new Date(a.created).getTime(),
      );

    res.json({
      success: true,
      backups: files,
      total: files.length,
    });
  } catch (error: unknown) {
    res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

// Restore from backup
router.post('/restore/:filename', (req: Request, res: Response) => {
  try {
    const filename = req.params.filename;
    if (!filename || !filename.includes('_backup_') || !filename.endsWith('.csv')) {
      return res.status(400).json({
        success: false,
        error: 'Invalid backup filename',
      });
    }

    const backupPath = path.join(process.cwd(), 'data', filename);
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({
        success: false,
        error: 'Backup file not found',
      });
    }

    // Determine target filename
    const type = filename.includes('freight') ? 'freight' : 'vehicle';
    const targetFilename = type === 'freight' ? 'freight_offers.csv' : 'vehicle_offers.csv';
    const targetPath = path.join(process.cwd(), 'data', targetFilename);

    // Create backup of current file before restore
    if (fs.existsSync(targetPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const preRestoreBackup = `${targetFilename.replace('.csv', '')}_backup_${timestamp}.csv`;
      const preRestoreBackupPath = path.join(process.cwd(), 'data', preRestoreBackup);
      fs.copyFileSync(targetPath, preRestoreBackupPath);
    }

    // Restore from backup
    fs.copyFileSync(backupPath, targetPath);

    res.json({
      success: true,
      message: `Successfully restored ${type} CSV from backup`,
      restored: {
        from: filename,
        to: targetFilename,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: unknown) {
    res.status(500).json(handleRouteError(error, 'POST /csv/restore', 'Restore failed'));
  }
});

export default router;
