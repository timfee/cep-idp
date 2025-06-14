import {
  getUser,
  postUser,
  updateUser
} from "@/app/lib/workflow/endpoints/admin";
import { createLiveApiContext } from "../../../test-utils/live-api-context";
import { sleep } from "../../../test-utils/sleep";

describe("Users - Live API", () => {
  let apiContext: ReturnType<typeof createLiveApiContext>;
  let primaryDomain: string;
  const timestamp = Date.now();

  beforeAll(async () => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;

    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: true
    });

    // Get primary domain first
    // Lazy import to keep the initial Jest environment lean and to sidestep
    // any circular references between endpoint helpers during test startup.
    const { listDomains } = await import("@/app/lib/workflow/endpoints/admin");
    const domains = await listDomains(apiContext, {
      customerId: "my_customer"
    });
    primaryDomain = (
      domains.domains as Array<{ domainName: string; isPrimary?: boolean }>
    ).find((d) => d.isPrimary)!.domainName;
  });

  it("should create, retrieve and update a user", async () => {
    const testEmail = `testuser${timestamp}@${primaryDomain}`;

    // Create user
    const createResult = await postUser(apiContext, {
      body: {
        primaryEmail: testEmail,
        password: `TempPass${Date.now()}!`,
        name: { givenName: "Test", familyName: "User" }
      }
    });

    expect(createResult.primaryEmail).toBe(testEmail);
    expect(createResult.id).toBeDefined();

    // Small delay to allow eventual consistency in Google's backend
    await sleep(2000);

    // Get user
    const getResult = await getUser(apiContext, { userEmail: testEmail });

    expect(getResult.primaryEmail).toBe(testEmail);

    // Update user
    const updateResult = await updateUser(apiContext, {
      userEmail: testEmail,
      body: { name: { givenName: "Updated" } }
    });

    expect(updateResult.name.givenName).toBe("Updated");
  });

  it("should handle non-existent user", async () => {
    await expect(
      getUser(apiContext, { userEmail: "nonexistent@example.com" })
    ).rejects.toThrow();
  });
});
