# ─────────────────────────────────────────────────────────────────────────────
# Remotion SSR renderer for Cloud Run.
# Ships headless Chromium (via Remotion's browser) + FFmpeg + Node.
# ─────────────────────────────────────────────────────────────────────────────
FROM node:20-bookworm-slim

# Chromium/Remotion runtime libraries + FFmpeg.
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    libnss3 libdbus-1-3 libatk1.0-0 libatk-bridge2.0-0 libcups2 \
    libdrm2 libgbm1 libasound2 libpango-1.0-0 libcairo2 \
    libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 \
    fonts-liberation fontconfig \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install deps first for layer caching. Remotion downloads its own Chromium shell
# at install time; ensure it can.
COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# Cloud Run injects PORT; default to 8080 for local runs.
ENV PORT=8080 NODE_ENV=production REMOTION_DISABLE_HEADFUL_VALIDATION=true
EXPOSE 8080

CMD ["node", "src/server.js"]
