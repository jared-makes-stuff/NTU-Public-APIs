#!/bin/bash
# Ultra-Low Memory Startup for Pi Zero 2 (512MB)

echo "--- Memory Status Before Start ---"
free -h
echo "----------------------------------"

# Ensure Swap is Active!
# If 'Swap' row is 0B, run: sudo dphys-swapfile setup

echo "Starting with AGGRESSIVE memory limits..."

# Optimizations:
# --max-old-space-size=150: Restrict JS Heap to 150MB (Leaves ~350MB for OS + Native code + Buffers)
# --no-warnings: Reduce log noise
# UV_THREADPOOL_SIZE=2: Reduce background worker threads (default 4) to save RAM
# MALLOC_ARENA_MAX=2: Glibc malloc tuning to prevent fragmentation

export UV_THREADPOOL_SIZE=2
export MALLOC_ARENA_MAX=2

node --max-old-space-size=150 --no-warnings src/index.js