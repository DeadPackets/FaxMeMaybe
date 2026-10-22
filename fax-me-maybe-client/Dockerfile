FROM ghcr.io/astral-sh/uv:python3.14-trixie-slim

# pyusb needs libusb; it came with chromium until that was removed
RUN apt-get update && apt-get install -y --no-install-recommends libusb-1.0-0 && rm -rf /var/lib/apt/lists/*

# Copy over uv files
WORKDIR /app
COPY pyproject.toml .
COPY uv.lock .

# Install dependencies with bytecode compilation
ENV UV_COMPILE_BYTECODE=1
RUN uv sync --locked

# Run the application
COPY main.py .
CMD ["uv", "run", "./main.py"]