# Test Utilities

This folder contains helper functions used by Jest to prepare authentication tokens and test data.

## Generating Google Credentials

### Google Cloud console

1. Open the [Google Cloud Console](https://console.cloud.google.com/).
2. Navigate to **IAM & Admin > Service Accounts** and create a new service account.
3. Enable **Domain-wide delegation** and download a JSON key.
4. In the Google Admin console, go to **Security > API controls > Domain-wide delegation** and grant the service account the required scopes.
5. Note the admin user email you want to impersonate during tests.

### gcloud CLI

```bash
gcloud iam service-accounts create cep-test --display-name "CEP Test"
gcloud iam service-accounts keys create key.json \
  --iam-account cep-test@YOUR_PROJECT.iam.gserviceaccount.com
# Enable domain wide delegation via Admin console as described above
```

Set the following environment variables before running the tests:

```bash
export GOOGLE_SERVICE_ACCOUNT_KEY=$(cat key.json)
export GOOGLE_ADMIN_EMAIL=admin@example.com
```

Alternatively, if your tests run on a machine configured with
[Workload Identity](https://cloud.google.com/workload-identity), set:

```bash
export GOOGLE_WORKLOAD_IDENTITY=1
export GOOGLE_SERVICE_ACCOUNT_EMAIL=cep-test@YOUR_PROJECT.iam.gserviceaccount.com
export GOOGLE_ADMIN_EMAIL=admin@example.com
```

## Generating Microsoft Credentials

### Azure portal

1. Open the [Azure Portal](https://portal.azure.com/).
2. Navigate to **Azure Active Directory > App registrations** and create a new application.
3. From **Certificates & secrets**, create a client secret.
4. Record the **Application (client) ID** and **Directory (tenant) ID**.
5. Grant Microsoft Graph permissions required by the workflow and admin consent.

### Azure CLI

```bash
az ad app create --display-name "CEP Test" --query appId -o tsv
az ad app credential reset --id <APP_ID> --password <CLIENT_SECRET>
# Retrieve tenant ID
ez account show --query tenantId -o tsv
```

Set these environment variables:

```bash
export MS_CLIENT_ID=<APP_ID>
export MS_CLIENT_SECRET=<CLIENT_SECRET>
export MS_TENANT_ID=<TENANT_ID>
```

With these variables set, `npm test` will automatically obtain tokens during the Jest global setup.
