FROM node:20-slim

# Install system dependencies for Playwright, OpenCV, and Audio
RUN apt-get update && apt-get install -y \
    python3 \
    python3-pip \
    ffmpeg \
    libnss3 \
    libnspr4 \
    libatk1.0-0 \
    libatk-bridge2.0-0 \
    libcups2 \
    libdrm2 \
    libdbus-1-3 \
    libxkbcommon0 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxrandr2 \
    libgbm1 \
    libasound2 \
    libpangocairo-1.0-0 \
    libgtk-3-0 \
    libgl1-mesa-glx \
    libglib2.0-0 \
    fonts-noto \
    fonts-freefont-ttf \
    fonts-liberation \
    wget \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy package files and install
COPY package*.json ./
RUN npm install

# Copy requirements and install python deps
COPY requirements.txt ./
RUN pip3 install --no-cache-dir -r requirements.txt --break-system-packages || pip3 install --no-cache-dir -r requirements.txt

# Install Playwright browsers (Chromium only)
RUN npx playwright install chromium

# Pre-download Whisper models (tiny and base) to avoid download at runtime
RUN python3 -c "import whisper; whisper.load_model('tiny'); whisper.load_model('base')"

# Copy application files
COPY . .

# Ensure output directory exists and is writable
RUN mkdir -p output background_clips music sfx && chmod -R 777 output background_clips music sfx

EXPOSE 3001

CMD ["node", "index.js"]
