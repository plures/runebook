#!/usr/bin/env bash
# RuneBook Ambient Agent Mode - "Zero to Hero" Demo Script
# This script demonstrates the full workflow from enabling the agent to viewing analysis results

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper functions
print_step() {
    echo -e "\n${BLUE}=== $1 ===${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓ $1${NC}"
}

print_error() {
    echo -e "${RED}✗ $1${NC}"
}

print_info() {
    echo -e "${YELLOW}ℹ $1${NC}"
}

wait_for_user() {
    echo -e "\n${YELLOW}Press Enter to continue...${NC}"
    read -r
}

# Check prerequisites
check_prerequisites() {
    print_step "Checking Prerequisites"
    
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    print_success "Node.js found"
    
    if ! command -v npm &> /dev/null; then
        print_error "npm is not installed"
        exit 1
    fi
    print_success "npm found"
    
    if ! command -v nix &> /dev/null; then
        print_warning "Nix is not installed - some demo commands may not work"
    else
        print_success "Nix found"
    fi
}

# Step 1: Enable Agent
enable_agent() {
    print_step "Step 1: Enabling Ambient Agent Mode"
    
    print_info "Enabling agent..."
    npm run agent enable || {
        print_error "Failed to enable agent"
        exit 1
    }
    print_success "Agent enabled"
    
    print_info "Checking agent status..."
    npm run agent status
    wait_for_user
}

# Step 2: Run failing commands
run_failing_commands() {
    print_step "Step 2: Running Failing Nix Commands"
    
    print_info "These commands will fail intentionally to demonstrate error capture and analysis"
    
    # Command 1: Missing attribute
    print_info "Running: nix build .#cursor (will fail - missing attribute)"
    nix build .#cursor 2>&1 || true
    sleep 1
    
    # Command 2: Flake-parts template path
    print_info "Running: nix flake init -t flake-parts#devShells (may fail - template path)"
    nix flake init -t flake-parts#devShells 2>&1 || true
    sleep 1
    
    # Command 3: Build environment (may fail)
    print_info "Running: nix build (may fail - build environment)"
    nix build 2>&1 || true
    sleep 1
    
    print_success "Commands executed (failures are expected)"
    wait_for_user
}

# Step 3: View captured events
view_events() {
    print_step "Step 3: Viewing Captured Events"
    
    print_info "Showing last 10 events..."
    npm run agent events 10
    wait_for_user
}

# Step 4: Analyze last failure
analyze_failure() {
    print_step "Step 4: Analyzing Last Failure"
    
    print_info "Analyzing the most recent command failure..."
    npm run analyze last || {
        print_error "Analysis failed or no failures found"
        print_info "This is okay if no failures were captured"
    }
    wait_for_user
}

# Step 5: View suggestions
view_suggestions() {
    print_step "Step 5: Viewing Suggestions"
    
    print_info "Showing all current suggestions..."
    npm run agent suggestions
    wait_for_user
}

# Step 6: Inspect memory (if PluresDB available)
inspect_memory() {
    print_step "Step 6: Inspecting Memory Storage"
    
    print_info "Attempting to inspect cognitive memory..."
    npm run memory inspect || {
        print_info "PluresDB not available - this is okay, using in-memory storage"
        print_info "To use PluresDB, start it with: pluresdb --port 34567"
    }
    wait_for_user
}

# Step 7: View statistics
view_statistics() {
    print_step "Step 7: Viewing Agent Statistics"
    
    print_info "Showing agent status and statistics..."
    npm run agent status
    wait_for_user
}

# Step 8: Observer mode (optional)
observer_demo() {
    print_step "Step 8: Observer Mode (Optional)"
    
    print_info "Enabling observer for detailed event capture..."
    npm run observer enable || {
        print_info "Observer enable failed - continuing anyway"
    }
    
    print_info "Showing observer status..."
    npm run observer status || {
        print_info "Observer status failed - continuing anyway"
    }
    
    print_info "To tail events in real-time, run: npm run observer events tail"
    wait_for_user
}

# Step 9: Cleanup (optional)
cleanup_demo() {
    print_step "Step 9: Cleanup (Optional)"
    
    print_info "You can clear old events with: npm run agent clear [days]"
    print_info "Example: npm run agent clear 7  (clears events older than 7 days)"
    
    read -p "Clear events now? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_info "Clearing events older than 30 days..."
        npm run agent clear 30 || {
            print_error "Failed to clear events"
        }
    else
        print_info "Skipping cleanup"
    fi
    wait_for_user
}

# Main demo flow
main() {
    echo -e "${GREEN}"
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║  RuneBook Ambient Agent Mode - Zero to Hero Demo           ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    
    check_prerequisites
    enable_agent
    run_failing_commands
    view_events
    analyze_failure
    view_suggestions
    inspect_memory
    view_statistics
    observer_demo
    cleanup_demo
    
    print_step "Demo Complete!"
    echo -e "${GREEN}Thank you for trying RuneBook Ambient Agent Mode!${NC}"
    echo ""
    echo "Next steps:"
    echo "  - Read docs/demo.md for detailed walkthrough"
    echo "  - Check README.md for full feature list"
    echo "  - Explore ANALYSIS_LADDER.md for analysis details"
    echo ""
}

# Run main function
main

