#!/bin/bash

set -e

DEPLOY_DIR="/var/www/edreading"
LOG_DIR="/var/log/edreading"

echo "=== EDReading Server Setup Script ==="
echo "This script will set up the server environment for EDReading deployment."
echo ""

echo "[1/6] Installing Node.js 20..."
if ! command -v node &> /dev/null; then
    curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
    sudo yum install -y nodejs
else
    echo "Node.js is already installed: $(node -v)"
fi

echo "[2/6] Installing PM2..."
if ! command -v pm2 &> /dev/null; then
    sudo npm install -g pm2
else
    echo "PM2 is already installed: $(pm2 -v)"
fi

echo "[3/6] Creating deployment directory..."
sudo mkdir -p $DEPLOY_DIR
sudo chown -R $USER:$USER $DEPLOY_DIR

echo "[4/6] Creating log directory..."
sudo mkdir -p $LOG_DIR
sudo chown -R $USER:$USER $LOG_DIR

echo "[5/6] Setting up PM2 startup script..."
pm2 startup systemd -u $USER --hp /home/$USER

echo "[6/6] Configuring firewall (if firewalld is active)..."
if systemctl is-active --quiet firewalld; then
    sudo firewall-cmd --permanent --add-port=3000/tcp
    sudo firewall-cmd --reload
    echo "Port 3000 opened in firewall"
else
    echo "Firewalld is not active, skipping firewall configuration"
fi

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Add the following secrets to your GitHub repository:"
echo "   - SERVER_HOST: Your server IP address"
echo "   - SERVER_USER: SSH username (usually 'root' or 'ec2-user')"
echo "   - SERVER_SSH_KEY: Your SSH private key"
echo "   - SERVER_PORT: SSH port (default: 22)"
echo "   - NEXT_PUBLIC_SUPABASE_URL: Your Supabase URL"
echo "   - NEXT_PUBLIC_SUPABASE_ANON_KEY: Your Supabase anon key"
echo ""
echo "2. Push your code to the main branch to trigger deployment"
echo ""
echo "3. For initial deployment, you may need to manually clone the repo first:"
echo "   cd $DEPLOY_DIR"
echo "   git clone https://github.com/YOUR_USERNAME/EDReading.git ."
echo "   npm ci --omit=dev"
echo "   pm2 start npm --name edreading -- start"
echo "   # app will listen on 0.0.0.0:3000 via package.json"
