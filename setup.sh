#!/bin/bash

# AdvancedDashboard Quick Setup Script
# This script helps you get started with the application

set -e

echo "🚀 AdvancedDashboard Setup Script"
echo "=================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

echo "✅ Docker and Docker Compose are installed"
echo ""

# Ask user what they want to do
echo "What would you like to do?"
echo "1) Run full stack (Docker Compose) - Recommended"
echo "2) Setup frontend for local development"
echo "3) Both"
echo ""
read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo ""
        echo "🐳 Starting full stack with Docker Compose..."
        echo "This will build and start all services (frontend, backend, nginx)"
        echo ""
        docker compose up --build
        ;;
    2)
        echo ""
        echo "📦 Setting up frontend for local development..."
        cd frontend
        
        if [ ! -d "node_modules" ]; then
            echo "Installing npm dependencies..."
            npm install
        else
            echo "Dependencies already installed"
        fi
        
        echo ""
        echo "✅ Frontend setup complete!"
        echo ""
        echo "To start the dev server, run:"
        echo "  cd frontend"
        echo "  npm run dev"
        echo ""
        echo "⚠️  Note: You'll need the backend running for API calls to work."
        echo "Start backend with: docker compose up api"
        ;;
    3)
        echo ""
        echo "📦 Setting up frontend for local development..."
        cd frontend
        
        if [ ! -d "node_modules" ]; then
            echo "Installing npm dependencies..."
            npm install
        else
            echo "Dependencies already installed"
        fi
        
        cd ..
        
        echo ""
        echo "🐳 Starting full stack with Docker Compose..."
        docker compose up --build
        ;;
    *)
        echo "Invalid choice. Exiting."
        exit 1
        ;;
esac
