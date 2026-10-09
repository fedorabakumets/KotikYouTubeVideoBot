# Назначение файла: среда скачивания YouTube с объединением видео и звука.
FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ffmpeg ca-certificates \
    && python3 -m venv /opt/youtube && /opt/youtube/bin/pip install --no-cache-dir 'yt-dlp[default]==2026.8.19' \
    && rm -rf /var/lib/apt/lists/*
ENV PATH="/opt/youtube/bin:$PATH" NODE_ENV=production
WORKDIR /app
COPY package.json ./
COPY worker ./worker
COPY tgcloud/lib/links.js ./tgcloud/lib/links.js
USER node
CMD ["node", "worker/server.js"]
