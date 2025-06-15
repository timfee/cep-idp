import { getUser } from "@/app/lib/workflow/endpoints/admin";
import { createLiveApiContext } from "../../../test-utils/live-api-context";

describe("Users - Live API", () => {

  let apiContext: ReturnType<typeof createLiveApiContext>;
  let primaryDomain: string;

  beforeAll(async () => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;

    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: false
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

  it("should handle non-existent user", async () => {
    await expect(
      getUser(apiContext, { userEmail: `nonexistent@${primaryDomain}` })
    ).rejects.toThrow();
  });
});
