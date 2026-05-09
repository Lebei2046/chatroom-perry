#!/bin/bash

MODEL_URL="https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip"
MODEL_DIR="$HOME/.perry/model"

echo "Installing Vosk model..."

mkdir -p "$MODEL_DIR"
cd "$MODEL_DIR"

if [ ! -f "vosk-model-small-en-us-0.15.zip" ]; then
    echo "Downloading model..."
    wget -q "$MODEL_URL" -O vosk-model-small-en-us-0.15.zip
fi

echo "Extracting model..."
unzip -o vosk-model-small-en-us-0.15.zip

echo "Copying files..."
cp -r vosk-model-small-en-us-0.15/* .

echo "Cleaning up..."
rm -rf vosk-model-small-en-us-0.15

echo "Vosk model installed successfully to $MODEL_DIR"