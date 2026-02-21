#!/bin/bash
# =============================================================================
# Chatr — Deploy to AWS
# Run this locally to copy deployAWS.sh to the server and execute it.
# Usage: bash aws.sh
# =============================================================================

set -e

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Config ────────────────────────────────────────────────────────────────────
KEY="$HOME/.ssh/chatr-key.pem"
SERVER="ubuntu@16.60.35.172"
SCRIPT="./deployAWS.sh"

# ── Checks ────────────────────────────────────────────────────────────────────
[ ! -f "$KEY" ]    && error "SSH key not found at $KEY"
[ ! -f "$SCRIPT" ] && error "Deploy script not found at $SCRIPT"

# ── Copy ──────────────────────────────────────────────────────────────────────
info "Copying deployAWS.sh to server..."
scp -i "$KEY" "$SCRIPT" "$SERVER:~/deployAWS.sh"
success "Script copied"

# ── Run ───────────────────────────────────────────────────────────────────────
info "Running deploy on server..."
echo ""
ssh -i "$KEY" "$SERVER" "chmod +x ~/deployAWS.sh && ~/deployAWS.sh 2>&1"

echo ""
success "Deploy complete!"

