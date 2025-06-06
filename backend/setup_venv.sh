#!/bin/bash

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "Activating virtual environment..."
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install --upgrade pip
pip install -r requirements.txt

echo "Virtual environment setup complete."
echo "To activate the virtual environment, run: source venv/bin/activate"
echo "To start the FastAPI app locally, run: uvicorn main:app --reload"