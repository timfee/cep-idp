import { postRoleAssign } from "@/app/lib/workflow/endpoints/admin";
import { createLiveApiContext } from "../../../test-utils/live-api-context";

describe("Role Assignments - Live API", () => {
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

    const { listDomains } = await import("@/app/lib/workflow/endpoints/admin");
    const domains = await listDomains(apiContext, { customerId: "my_customer" });
    primaryDomain = (
      domains.domains as Array<{ domainName: string; isPrimary?: boolean }>
    ).find((d) => d.isPrimary)!.domainName;
  });

  it("should fail for invalid assignment", async () => {
    await expect(
      postRoleAssign(apiContext, {
        customerId: "my_customer",
        body: {
          roleId: "badRole",
          assignedTo: `nouser@${primaryDomain}`,
          assigneeType: "user",
          scopeType: "CUSTOMER"
        }
      })
    ).rejects.toThrow();
  });
});
