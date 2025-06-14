import { listPrivileges } from "@/app/lib/workflow/endpoints/admin";
import { createLiveApiContext } from "../../../test-utils/live-api-context";

describe("Privileges - Live API", () => {
  let apiContext: ReturnType<typeof createLiveApiContext>;

  beforeAll(() => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;

    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: false
    });
  });

  it("should list privileges", async () => {
    const res = await listPrivileges(apiContext, { customerId: "my_customer" });
    expect(res).toBeDefined();
    expect(Array.isArray(res.items)).toBe(true);
    expect(res.items.length).toBeGreaterThan(0);
  });

  it("should handle invalid customer ID", async () => {
    await expect(
      listPrivileges(apiContext, { customerId: "bad_customer" })
    ).rejects.toThrow();
  });
});
