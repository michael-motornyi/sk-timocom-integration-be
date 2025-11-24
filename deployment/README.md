# AWS EC2 Deployment Setup

This document explains how to set up AWS EC2 deployment for the TIMOCOM Integration API.

## Prerequisites

### 1. AWS Setup
- AWS account with appropriate permissions
- S3 bucket for deployment artifacts
- EC2 instance running Ubuntu/Amazon Linux

### 2. EC2 Instance Setup

#### Install required software:
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Install unzip if not present
sudo apt install unzip -y
```

#### Configure AWS CLI on EC2:
```bash
aws configure
# Enter your AWS credentials and region
```

#### Create systemd service:
```bash
# Copy the service file to systemd directory
sudo cp deployment/timocom-integration.service /etc/systemd/system/

# Reload systemd and enable service
sudo systemctl daemon-reload
sudo systemctl enable timocom-integration
```

### 3. Security Groups
Configure EC2 security group to allow:
- Port 22 (SSH) from your IP
- Port 3001 (API) from required sources
- Port 443 (HTTPS) if using SSL

### 4. Environment Variables
Create environment file on EC2:
```bash
# Create environment file
sudo nano /home/ubuntu/.env.timocom-integration
```

Add your environment variables:
```env
NODE_ENV=production
PORT=3001
TIMOCOM_API_BASE_URL=https://api.timocom.com
TIMOCOM_COMPANY_ID=your_company_id
TIMOCOM_USERNAME=your_username
TIMOCOM_PASSWORD=your_password
```

## GitHub Secrets Setup

Add these secrets to your GitHub repository:

### Required Secrets:
```
AWS_ACCESS_KEY_ID          # AWS access key for deployment
AWS_SECRET_ACCESS_KEY      # AWS secret key for deployment
AWS_REGION                 # AWS region (e.g., us-east-1)
S3_DEPLOYMENT_BUCKET       # S3 bucket name for artifacts
EC2_HOST                   # EC2 instance public IP/hostname
EC2_USER                   # EC2 username (usually ubuntu)
EC2_SSH_KEY               # Private SSH key for EC2 access
```

### Optional Secrets:
```
EC2_PORT                   # SSH port (default: 22)
```

## Deployment Process

### Automatic Deployment
The GitHub Action triggers automatically on:
- Push to `main` branch
- Push to `production` branch
- Manual workflow dispatch

### Manual Deployment
You can trigger deployment manually:
1. Go to GitHub Actions tab
2. Select "Deploy to AWS EC2" workflow
3. Click "Run workflow"
4. Choose branch and run

## Deployment Steps

The deployment process:

1. **Build & Test**: Builds the application and runs tests
2. **Package**: Creates deployment zip with built files
3. **Upload**: Uploads package to S3 bucket
4. **Deploy**: SSH to EC2 and performs deployment:
   - Stops current service
   - Creates backup of current deployment
   - Downloads and extracts new package
   - Installs dependencies
   - Updates environment file
   - Starts service
   - Performs health check
   - Cleans up old deployments

## Monitoring & Logs

### Check service status:
```bash
sudo systemctl status timocom-integration
```

### View logs:
```bash
# Real-time logs
sudo journalctl -u timocom-integration -f

# Recent logs
sudo journalctl -u timocom-integration -n 50
```

### Check application health:
```bash
curl http://localhost:3001/health
```

## Rollback Process

### Manual Rollback:
```bash
# Stop service
sudo systemctl stop timocom-integration

# Go to app directory
cd /home/ubuntu/timocom-integration

# List available backups
ls -la /home/ubuntu/backups/

# Extract previous backup
sudo tar -xzf /home/ubuntu/backups/backup-YYYYMMDD-HHMMSS.tar.gz

# Replace current with backup
sudo rm -rf current
sudo mv backup-folder current

# Start service
sudo systemctl start timocom-integration
```

## SSL/HTTPS Setup (Optional)

### Using Let's Encrypt with nginx:
```bash
# Install nginx
sudo apt install nginx -y

# Install certbot
sudo apt install certbot python3-certbot-nginx -y

# Configure nginx proxy (create /etc/nginx/sites-available/timocom-api)
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/timocom-api /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

## Troubleshooting

### Common Issues:

1. **Service won't start**:
   - Check logs: `sudo journalctl -u timocom-integration`
   - Verify Node.js installation: `node --version`
   - Check file permissions: `ls -la /home/ubuntu/timocom-integration/current`

2. **Deployment fails**:
   - Verify AWS credentials and permissions
   - Check S3 bucket access
   - Verify SSH key and EC2 connectivity

3. **Health check fails**:
   - Check if service is running: `sudo systemctl status timocom-integration`
   - Verify port 3001 is not blocked
   - Check application logs for errors

### Health Endpoints:
- Health check: `GET /health`
- API documentation: `GET /api/docs`
- Test TIMOCOM connection: `GET /api/timocom/test`

## Scaling Considerations

### For production use, consider:
- Load balancer (AWS ALB/ELB)
- Auto Scaling Group
- RDS for data persistence
- CloudWatch monitoring
- Multiple availability zones
- Container deployment (ECS/EKS)
