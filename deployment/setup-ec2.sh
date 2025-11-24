#!/bin/bash

# EC2 Instance Setup Script for TIMOCOM Integration API
# Run this script on your EC2 instance to prepare it for deployment

set -e

echo "🚀 Setting up EC2 instance for TIMOCOM Integration API deployment..."

# Update system
echo "📦 Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "🟢 Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verify Node.js installation
echo "✅ Node.js version: $(node --version)"
echo "✅ NPM version: $(npm --version)"

# Install AWS CLI
echo "☁️ Installing AWS CLI..."
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
rm -rf awscliv2.zip aws/

# Install additional tools
echo "🔧 Installing additional tools..."
sudo apt install -y unzip curl wget htop

# Create application directories
echo "📁 Creating application directories..."
mkdir -p /home/ubuntu/timocom-integration
mkdir -p /home/ubuntu/backups

# Set up systemd service
echo "⚙️ Setting up systemd service..."
sudo tee /etc/systemd/system/timocom-integration.service > /dev/null <<EOF
[Unit]
Description=TIMOCOM Integration API Server
Documentation=https://github.com/your-org/timocom-integration
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu/timocom-integration/current
ExecStart=/usr/bin/node dist/server.js
Restart=always
RestartSec=10
Environment=NODE_ENV=production
Environment=PORT=3001

# Logging
StandardOutput=journal
StandardError=journal
SyslogIdentifier=timocom-integration

# Security settings
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
ReadWritePaths=/home/ubuntu/timocom-integration

# Resource limits
LimitNOFILE=65536
MemoryMax=1G

[Install]
WantedBy=multi-user.target
EOF

# Reload systemd
sudo systemctl daemon-reload
sudo systemctl enable timocom-integration

# Configure AWS CLI (interactive)
echo "🔑 Configure AWS CLI with your credentials..."
echo "You'll need:"
echo "- AWS Access Key ID"
echo "- AWS Secret Access Key"
echo "- Default region (e.g., us-east-1)"
echo "- Output format (json)"
aws configure

# Create environment file template
echo "📝 Creating environment file template..."
cat > /home/ubuntu/.env.timocom-integration <<EOF
NODE_ENV=production
PORT=3001

# TIMOCOM API Configuration
TIMOCOM_API_BASE_URL=https://api.timocom.com
TIMOCOM_COMPANY_ID=your_company_id
TIMOCOM_USERNAME=your_username
TIMOCOM_PASSWORD=your_password

# Optional: Add other environment variables as needed
# LOG_LEVEL=info
# CORS_ORIGIN=*
EOF

echo "📝 Please edit the environment file with your actual values:"
echo "nano /home/ubuntu/.env.timocom-integration"

# Set up log rotation
echo "📊 Setting up log rotation..."
sudo tee /etc/logrotate.d/timocom-integration > /dev/null <<EOF
/var/log/timocom-integration/*.log {
    daily
    missingok
    rotate 30
    compress
    delaycompress
    notifempty
    create 0644 ubuntu ubuntu
    postrotate
        systemctl reload timocom-integration
    endscript
}
EOF

# Create log directory
sudo mkdir -p /var/log/timocom-integration
sudo chown ubuntu:ubuntu /var/log/timocom-integration

# Set up firewall (UFW)
echo "🔒 Configuring firewall..."
sudo ufw --force enable
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 3001/tcp comment "TIMOCOM Integration API"

# Display firewall status
sudo ufw status

echo ""
echo "✅ EC2 instance setup completed!"
echo ""
echo "📋 Next steps:"
echo "1. Edit environment file: nano /home/ubuntu/.env.timocom-integration"
echo "2. Configure your GitHub repository secrets"
echo "3. Push code to trigger deployment"
echo ""
echo "🔍 Useful commands:"
echo "- Check service status: sudo systemctl status timocom-integration"
echo "- View logs: sudo journalctl -u timocom-integration -f"
echo "- Test health: curl http://localhost:3001/health"
echo ""
echo "🌐 Your API will be available at:"
echo "- Health check: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3001/health"
echo "- API docs: http://$(curl -s http://169.254.169.254/latest/meta-data/public-ipv4):3001/api/docs"
