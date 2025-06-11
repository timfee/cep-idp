#!/bin/bash

# Token Retrieval Script for Google Cloud and Microsoft Azure
# Usage: ./get_tokens.sh [google|microsoft|both]

set -e

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Configuration
GOOGLE_KEY_FILE="$SCRIPT_DIR/google_config.json"
MICROSOFT_CONFIG_FILE="$SCRIPT_DIR/microsoft_config.json"
TOKEN_OUTPUT_DIR="$SCRIPT_DIR"

# Admin email for Google domain-wide delegation
GOOGLE_ADMIN_EMAIL="tim@timfeeley.com"

# Google scopes
GOOGLE_SCOPES="openid email profile https://www.googleapis.com/auth/admin.directory.user https://www.googleapis.com/auth/admin.directory.orgunit https://www.googleapis.com/auth/admin.directory.domain https://www.googleapis.com/auth/admin.directory.rolemanagement https://www.googleapis.com/auth/cloud-identity.inboundsso https://www.googleapis.com/auth/siteverification"

# Function to check dependencies
check_dependencies() {
    local missing_deps=()

    if ! command -v jq &> /dev/null; then
        missing_deps+=("jq")
    fi

    if ! command -v curl &> /dev/null; then
        missing_deps+=("curl")
    fi

    if [ ${#missing_deps[@]} -ne 0 ]; then
        echo "Error: Missing dependencies: ${missing_deps[*]}"
        echo "  Ubuntu/Debian: sudo apt-get install jq curl"
        echo "  macOS: brew install jq curl"
        exit 1
    fi
}

# Base64url encode
base64url() {
    openssl enc -base64 -A | tr '+/' '-_' | tr -d '='
}

# Function to get Google Cloud access token with admin impersonation
get_google_token() {
    if [ ! -f "$GOOGLE_KEY_FILE" ]; then
        echo "Error: Google key file not found at $GOOGLE_KEY_FILE"
        return 1
    fi

    # Extract required fields from service account key
    local client_email=$(jq -r '.client_email' "$GOOGLE_KEY_FILE")
    local private_key=$(jq -r '.private_key' "$GOOGLE_KEY_FILE")

    # Create JWT
    local now=$(date +%s)
    local exp=$((now + 3600))

    local header='{"alg":"RS256","typ":"JWT"}'
    local claim=$(cat <<EOF
{
    "iss": "$client_email",
    "sub": "$GOOGLE_ADMIN_EMAIL",
    "scope": "$GOOGLE_SCOPES",
    "aud": "https://oauth2.googleapis.com/token",
    "exp": $exp,
    "iat": $now
}
EOF
)

    local header_b64=$(echo -n "$header" | base64url)
    local claim_b64=$(echo -n "$claim" | base64url)
    local signing_input="${header_b64}.${claim_b64}"

    local signature=$(echo -n "$signing_input" | \
        openssl dgst -sha256 -sign <(echo "$private_key") | \
        base64url)

    local jwt="${signing_input}.${signature}"

    # Exchange JWT for access token
    local response=$(curl -s -X POST https://oauth2.googleapis.com/token \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=$jwt")

    local access_token=$(echo "$response" | jq -r '.access_token')

    if [ "$access_token" != "null" ] && [ -n "$access_token" ]; then
        echo "$access_token" > "$TOKEN_OUTPUT_DIR/google_token.txt"
        echo "$response" | jq '.' > "$TOKEN_OUTPUT_DIR/google_token.json"
        echo "Google token saved"
        return 0
    else
        echo "Failed to get Google token"
        echo "$response" | jq '.'
        return 1
    fi
}

# Function to get Microsoft access token (v2.0 endpoint)
get_microsoft_token() {
    if [ ! -f "$MICROSOFT_CONFIG_FILE" ]; then
        echo "Error: Microsoft config file not found at $MICROSOFT_CONFIG_FILE"
        echo "Create it with:"
        echo '{
    "tenant_id": "YOUR_TENANT_ID",
    "client_id": "YOUR_CLIENT_ID",
    "client_secret": "YOUR_CLIENT_SECRET"
}'
        return 1
    fi

    # Extract credentials
    local tenant_id=$(jq -r '.tenant_id' "$MICROSOFT_CONFIG_FILE")
    local client_id=$(jq -r '.client_id' "$MICROSOFT_CONFIG_FILE")
    local client_secret=$(jq -r '.client_secret' "$MICROSOFT_CONFIG_FILE")

    # v2.0 endpoint with .default scope for application permissions
    local response=$(curl -s -X POST \
        "https://login.microsoftonline.com/$tenant_id/oauth2/v2.0/token" \
        -H "Content-Type: application/x-www-form-urlencoded" \
        -d "grant_type=client_credentials" \
        -d "client_id=$client_id" \
        -d "client_secret=$client_secret" \
        -d "scope=https://graph.microsoft.com/.default")

    local access_token=$(echo "$response" | jq -r '.access_token // empty')
    local error=$(echo "$response" | jq -r '.error // empty')

    if [ -n "$error" ]; then
        echo "Microsoft error: $error"
        echo "$response" | jq '.'
        return 1
    fi

    if [ -n "$access_token" ]; then
        echo "$access_token" > "$TOKEN_OUTPUT_DIR/microsoft_token.txt"
        echo "$response" | jq '.' > "$TOKEN_OUTPUT_DIR/microsoft_token.json"
        echo "Microsoft token saved"
        return 0
    else
        echo "Failed to get Microsoft token"
        echo "$response" | jq '.'
        return 1
    fi
}

# Main function
main() {
    check_dependencies

    local provider="${1:-both}"

    case "$provider" in
        google)
            get_google_token
            ;;
        microsoft|azure)
            get_microsoft_token
            ;;
        both)
            get_google_token
            get_microsoft_token
            ;;
        *)
            echo "Usage: $0 [google|microsoft|both]"
            exit 1
            ;;
    esac
}

main "$@"
