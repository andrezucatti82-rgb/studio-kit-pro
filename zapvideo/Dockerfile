FROM node:24-bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg fonts-liberation \
    && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY zapvideo/container.mjs zapvideo/renderer.mjs ./zapvideo/
COPY style-atlas/dist/zapvideo-contract.mjs style-atlas/dist/zapvideo-captions.mjs style-atlas/dist/zapvideo-assembly.mjs ./style-atlas/dist/
ENV RENDER_HOST=0.0.0.0 PORT=4000
EXPOSE 4000
USER node
CMD ["node", "zapvideo/container.mjs"]
