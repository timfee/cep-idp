import { GoogleAuth, JWT } from "google-auth-library";
import {
  googleOAuthConfig,
  microsoftOAuthConfig,
} from "../app/lib/auth/oauth-server";

const googleScopes = googleOAuthConfig.scopes;

const microsoftScopes = microsoftOAuthConfig.scopes;

const googleTokenUrl = googleOAuthConfig.tokenUrl;
const microsoftTokenUrl = microsoftOAuthConfig.tokenUrl;

interface GoogleKey {
  client_email: string;
  private_key: string;
}

export async function getGoogleAccessToken() {
  const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
  const serviceAccount = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const useWorkload = process.env.GOOGLE_WORKLOAD_IDENTITY;
  const adminEmail = process.env.GOOGLE_ADMIN_EMAIL;
  const scopes = process.env.GOOGLE_SCOPES || googleScopes.join(" ");
  const tokenUrl = googleTokenUrl;

  if (!adminEmail) {
    console.warn("GOOGLE_ADMIN_EMAIL not set; skipping Google token request");
    return;
  }

  if (keyJson) {
    const key = JSON.parse(keyJson) as GoogleKey;
    const client = new JWT({
      email: key.client_email,
      key: key.private_key,
      scopes: scopes.split(" "),
      subject: adminEmail,
    });
    try {
      const authRes = await client.authorize();
      if (authRes.access_token) {
        process.env.GOOGLE_ACCESS_TOKEN = authRes.access_token;
      } else {
        console.warn(`Google token error: ${JSON.stringify(authRes)}`);
      }
    } catch (err) {
      console.warn("Google token request failed", err);
    }
    return;
  }

  if (useWorkload && serviceAccount) {
    const now = Math.floor(Date.now() / 1000);
    const exp = now + 3600;
    const auth = new GoogleAuth({
      scopes: "https://www.googleapis.com/auth/iam",
    });
    const client = await auth.getClient();
    const signRes = await client.request<{ signedJwt: string }>({
      url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${serviceAccount}:signJwt`,
      method: "POST",
      data: {
        payload: JSON.stringify({
          iss: serviceAccount,
          sub: adminEmail,
          scope: scopes,
          aud: tokenUrl,
          exp,
          iat: now,
        }),
      },
    });

    const jwt = (signRes.data as any).signedJwt as string;
    try {
      const res = await fetch(tokenUrl, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
          assertion: jwt,
        }),
      });

      const data = (await res.json()) as any;
      if (!res.ok) {
        console.warn(`Google token error: ${JSON.stringify(data)}`);
        return;
      }

      process.env.GOOGLE_ACCESS_TOKEN = data.access_token;
    } catch (err) {
      console.warn("Google token request failed", err);
    }
    return;
  }

  console.warn(
    "GOOGLE_SERVICE_ACCOUNT_KEY not provided and workload identity not enabled"
  );
}

export async function getMicrosoftAccessToken() {
  const tenantId = process.env.MS_TENANT_ID;
  const clientId = process.env.MS_CLIENT_ID;
  const clientSecret = process.env.MS_CLIENT_SECRET;
  if (!tenantId || !clientId || !clientSecret) {
    console.warn("Missing Microsoft credentials");
    return;
  }

  // Use the Microsoft Graph API default scope for client credentials grant
  const clientScope = "https://graph.microsoft.com/.default";
  const tokenUrl = microsoftTokenUrl.replace("organizations", tenantId);

  try {
    const res = await fetch(tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
        scope: clientScope,
      }),
    });

    const data = (await res.json()) as any;
    if (!res.ok) {
      console.warn(`Microsoft token error: ${JSON.stringify(data)}`);
      return;
    }

    process.env.MICROSOFT_ACCESS_TOKEN = data.access_token;
  } catch (err) {
    console.warn("Microsoft token request failed", err);
  }
}
