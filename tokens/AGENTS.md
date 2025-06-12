# API Authentication Instructions

After running `./tokens/get_tokens.sh`, you'll have access tokens for both Google and Microsoft APIs.

## Token Files Location

- **Google Access Token**: `./tokens/google_token.txt` (plain text token)
- **Google Token Details**: `./tokens/google_token.json` (full response with metadata)
- **Microsoft Access Token**: `./tokens/microsoft_token.txt` (plain text token)
- **Microsoft Token Details**: `./tokens/microsoft_token.json` (full response with metadata)

## Using the Tokens

### Quick Usage (Plain Text Tokens)

```bash
# Google API request
curl -H "Authorization: Bearer $(cat ./tokens/google_token.txt)" \
  "https://www.googleapis.com/admin/directory/v1/users?domain=timfeeley.com"

# Microsoft API request
curl -H "Authorization: Bearer $(cat ./tokens/microsoft_token.txt)" \
  "https://graph.microsoft.com/v1.0/users"
```

### Extract from JSON (Alternative Method)

```bash
# Google token from JSON
GOOGLE_TOKEN=$(jq -r '.access_token' ./tokens/google_token.json)

# Microsoft token from JSON
MICROSOFT_TOKEN=$(jq -r '.access_token' ./tokens/microsoft_token.json)
```

## Common API Examples

### Google Workspace Admin APIs

```bash
TOKEN=$(cat ./tokens/google_token.txt)

# List all users in the domain
curl -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/admin/directory/v1/users?domain=timfeeley.com"

# Get specific user details
curl -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/admin/directory/v1/users/tim@timfeeley.com"

# List organizational units
curl -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/admin/directory/v1/customer/my_customer/orgunits"

# List admin roles
curl -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/admin/directory/v1/customer/my_customer/roles"

# List domains
curl -H "Authorization: Bearer $TOKEN" \
  "https://www.googleapis.com/admin/directory/v1/customer/my_customer/domains"
```

### Microsoft Graph APIs

```bash
TOKEN=$(cat ./tokens/microsoft_token.txt)

# List all users
curl -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/users"

# Get organization details
curl -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/organization"

# List all applications
curl -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/applications"

# List directory roles
curl -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/directoryRoles"

# List app role assignments
curl -H "Authorization: Bearer $TOKEN" \
  "https://graph.microsoft.com/v1.0/servicePrincipals"
```

## Token Information

### Check Token Expiration

```bash
# Google token expires in (seconds)
jq -r '.expires_in' ./tokens/google_token.json

# Microsoft token expiration timestamp
jq -r '.expires_in' ./tokens/microsoft_token.json
```

### Token Scope/Permissions

- **Google**: Acting as admin user `tim@timfeeley.com` with full admin directory access
- **Microsoft**: Application-level permissions for directory and application management

## Important Notes

1. Tokens expire after ~1 hour (3600 seconds)
2. Re-run `./tokens/get_tokens.sh` to refresh tokens
3. All API requests must use HTTPS
4. The Google token impersonates `tim@timfeeley.com` for admin operations
5. Microsoft token has application-level (not delegated) permissions

## Quick Test Commands

```bash
# Test Google token
curl -s -H "Authorization: Bearer $(cat ./tokens/google_token.txt)" \
  "https://www.googleapis.com/admin/directory/v1/users?maxResults=1&domain=timfeeley.com" | jq '.users[0].primaryEmail'

# Test Microsoft token
curl -s -H "Authorization: Bearer $(cat ./tokens/microsoft_token.txt)" \
  "https://graph.microsoft.com/v1.0/organization" | jq '.'
```
