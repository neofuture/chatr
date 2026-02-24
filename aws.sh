#!/bin/bash
# =============================================================================
# Chatr — Deploy to AWS
# Run this locally: bash aws.sh [backend|frontend|docs]
#
# Examples:
#   bash aws.sh               — full deploy (all steps)
#   bash aws.sh backend       — rebuild & restart backend only
#   bash aws.sh frontend      — rebuild & restart frontend only
#   bash aws.sh docs          — sync Documentation folder only
# =============================================================================

RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; BLUE='\033[0;34m'; CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
info()    { echo -e "${BLUE}[INFO]${NC} $1"; }
success() { echo -e "${GREEN}[OK]${NC} $1"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $1"; }
error()   { echo -e "${RED}[ERROR]${NC} $1"; exit 1; }

# ── Config ────────────────────────────────────────────────────────────────────
KEY="$HOME/.ssh/chatr-key.pem"
SERVER="ubuntu@16.60.35.172"
SCRIPT="./deployAWS.sh"

# ── Parse target argument ─────────────────────────────────────────────────────
TARGET="${1:-}"

case "$TARGET" in
  backend|frontend|docs|"")
    ;;  # valid
  *)
    printf "${BOLD}Usage:${NC} bash aws.sh [backend|frontend|docs]\n\n"
    echo "  (no arg)   Full deploy — all steps"
    echo "  backend    Rebuild & restart backend only"
    echo "  frontend   Rebuild & restart frontend only"
    echo "  docs       Sync Documentation folder only"
    exit 1
    ;;
esac

# ── Print what we're about to do ──────────────────────────────────────────────
echo ""
echo -e "${BOLD}${CYAN}  Chatr AWS Deploy${NC}"
if [ -z "$TARGET" ]; then
  echo -e "  Mode    : ${BOLD}Full deploy${NC} (all steps)"
else
  echo -e "  Mode    : ${BOLD}${TARGET}${NC} only"
fi
echo -e "  Server  : ${SERVER}"
echo ""

# ── Checks ────────────────────────────────────────────────────────────────────
[ ! -f "$KEY" ]    && error "SSH key not found at $KEY"
[ ! -f "$SCRIPT" ] && error "Deploy script not found: $SCRIPT"

# ── Shared SSH options ────────────────────────────────────────────────────────
# ServerAliveInterval=60 + ServerAliveCountMax=60 = up to 60 mins before timeout
# This is needed because Storybook/Next.js builds can take 10–20+ minutes on small instances
SSH_OPTS="-i $KEY -o StrictHostKeyChecking=no -o ConnectTimeout=15 -o ServerAliveInterval=60 -o ServerAliveCountMax=60"

# ── Connectivity pre-check ────────────────────────────────────────────────────
info "Checking SSH connectivity to $SERVER..."
ssh $SSH_OPTS -o BatchMode=yes "$SERVER" "echo ok" > /dev/null 2>&1 \
  || error "Cannot reach $SERVER — check the server is running and port 22 is open in the AWS Security Group"
success "Server reachable"

# ── For docs, we can rsync directly — no need to run deployAWS.sh ─────────────
if [ "$TARGET" = "docs" ]; then
  info "Syncing Documentation/ to server..."
  rsync -az --delete --progress \
    -e "ssh $SSH_OPTS" \
    ./Documentation/ \
    "$SERVER:/home/ubuntu/chatr/Documentation/" \
    || error "rsync failed — check the server is running and ~/chatr/Documentation exists"
  success "Documentation synced"
  echo ""
  success "Docs deploy complete!"
  exit 0
fi

# ── Copy deploy script ────────────────────────────────────────────────────────
info "Copying deployAWS.sh to server..."
scp $SSH_OPTS "$SCRIPT" "$SERVER:~/deployAWS.sh" \
  || error "SCP failed — check your key and server IP"
success "Script copied"

# ── Run on server, passing target as argument ─────────────────────────────────
info "Running deploy on server (streaming output)..."
echo ""
ssh $SSH_OPTS -tt "$SERVER" \
  "bash ~/deployAWS.sh ${TARGET}" \
  || error "Deploy script exited with an error — check output above"

echo ""
success "Deploy complete!"
