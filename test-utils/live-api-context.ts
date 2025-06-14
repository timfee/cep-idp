/* eslint-disable no-magic-numbers */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ApiContext } from "@/app/lib/workflow/endpoints/utils";
import { globalTracker } from "./test-resource-tracker";

interface LiveApiOptions {
  trackCreatedResources?: boolean;
  googleToken: string;
  microsoftToken: string;
}

export function createLiveApiContext(options: LiveApiOptions): ApiContext {
  const { googleToken, microsoftToken, trackCreatedResources = true } = options;

  return {
    request: async (connection, method, path, opts) => {
      // Determine which token to use
      let token = "";
      if (connection.startsWith("graph")) {
        token = microsoftToken;
      } else if (connection.startsWith("google")) {
        token = googleToken;
      }

      // Build full URL
      const baseUrls: Record<string, string> = {
        googleAdmin: "https://admin.googleapis.com/admin/directory/v1",
        // Cloud Identity base host without version so that paths including
        // `/v1` resolve correctly when passed to `new URL`.
        googleCI: "https://cloudidentity.googleapis.com",
        graphGA: "https://graph.microsoft.com/v1.0",
        graphBeta: "https://graph.microsoft.com/beta",
        public: "https://login.microsoftonline.com"
      };

      const baseUrl = baseUrls[connection] || "";
      const url = new URL(path, baseUrl);

      // Add query params
      if (opts?.query) {
        Object.entries(opts.query).forEach(([key, value]) => {
          if (value !== undefined) {
            url.searchParams.append(key, value);
          }
        });
      }

      console.log(`[API] ${method} ${url.toString()}`);

      // Make the request
      const response = await fetch(url.toString(), {
        method,
        headers: {
          Authorization: token ? `Bearer ${token}` : "",
          "Content-Type": "application/json",
          Accept: "application/json"
        },
        body: opts?.body ? JSON.stringify(opts.body) : undefined
      });

      const responseText = await response.text();
      let responseData: any;

      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (!response.ok) {
        console.error(
          `[API ERROR] ${method} ${url.toString()}: ${response.status}`
        );
        console.error("[API ERROR]", responseData);
        throw new Error(
          `API error: ${response.status} - ${JSON.stringify(responseData)}`
        );
      }

      // Track created resources
      if (
        trackCreatedResources
        && method === "POST"
        && response.status === 201
      ) {
        await trackResourceFromResponse(connection, path, responseData);
      }

      return responseData;
    }
  };
}

// eslint-disable-next-line sonarjs/cognitive-complexity
async function trackResourceFromResponse(
  connection: string,
  path: string,
  response: any
) {
  // Detect resource type and ID from response
  if (connection === "googleAdmin") {
    if (path.includes("/users") && response.id) {
      await globalTracker.track(
        "google_user",
        response.primaryEmail || response.id
      );
    } else if (path.includes("/orgunits") && response.orgUnitId) {
      await globalTracker.track(
        "google_ou",
        response.orgUnitPath || response.orgUnitId
      );
    } else if (path.includes("/roles") && response.roleId) {
      await globalTracker.track("google_role", response.roleId);
    }
  } else if (connection === "googleCI") {
    if (path.includes("/inboundSamlSsoProfiles") && response.response?.name) {
      await globalTracker.track("google_saml_profile", response.response.name);
    }
  } else if (connection.startsWith("graph")) {
    if (path.includes("/applicationTemplates") && response.application?.id) {
      await globalTracker.track("microsoft_app", response.application.id);
      if (response.servicePrincipal?.id) {
        await globalTracker.track("microsoft_sp", response.servicePrincipal.id);
      }
    } else if (path.includes("/policies") && response.id) {
      await globalTracker.track("microsoft_policy", response.id);
    }
  }
}
