import { listDomains } from "@/app/lib/workflow/endpoints/admin/list-domains";
import { createLiveApiContext } from "../../setup/live-api-context";

describe("listDomains - Live API", () => {
  let apiContext: ReturnType<typeof createLiveApiContext>;

  beforeAll(() => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;

    if (!googleToken) {
      throw new Error("GOOGLE_ACCESS_TOKEN not set");
    }

    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: false, // List operations don't create resources
    });
  });

  it("should list domains successfully", async () => {
    const result = await listDomains(apiContext, { customerId: "my_customer" });

    expect(result).toBeDefined();
    expect(result).toHaveProperty("domains");
    expect(Array.isArray(result.domains)).toBe(true);

    // Should have at least the primary domain
    expect(result.domains.length).toBeGreaterThan(0);

    const primaryDomain = (
      result.domains as Array<{ isPrimary?: boolean; verified?: boolean }>
    ).find((d) => d.isPrimary);
    expect(primaryDomain).toBeDefined();
    expect(primaryDomain.verified).toBe(true);
  });

  it("should handle invalid customer ID", async () => {
    await expect(
      listDomains(apiContext, { customerId: "invalid_customer_id" })
    ).rejects.toThrow();
  });
});
