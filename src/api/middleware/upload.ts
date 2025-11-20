import path from 'node:path';
import type { Request } from 'express';
import fs from 'fs-extra';
import multer from 'multer';

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (
    _req: Request,
    _file: Express.Multer.File,
    cb: (error: Error | null, destination: string) => void,
  ) => {
    const uploadDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (
    _req: Request,
    file: Express.Multer.File,
    cb: (error: Error | null, filename: string) => void,
  ) => {
    // Keep original filename but create backup first
    const originalPath = path.join(process.cwd(), 'data', file.originalname);
    if (fs.existsSync(originalPath)) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const backupName = file.originalname.replace('.csv', `_backup_${timestamp}.csv`);
      const backupPath = path.join(process.cwd(), 'data', backupName);
      fs.copyFileSync(originalPath, backupPath);
      console.log(`📁 Backup created: ${backupName}`);
    }
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage: storage,
  fileFilter: (_req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});

export { upload };
