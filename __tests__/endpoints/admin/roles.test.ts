import { listRoles, postRole } from "@/app/lib/workflow/endpoints/admin";
import { createLiveApiContext } from "../../../test-utils/live-api-context";

describe("Roles - Live API", () => {
  let apiContext: ReturnType<typeof createLiveApiContext>;
  const testRoleName = `TestRole_${Date.now()}`;

  beforeAll(() => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;

    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: true,
    });
  });

  it("should create and list roles", async () => {
    const createRes = await postRole(apiContext, {
      customerId: "my_customer",
      body: {
        roleName: testRoleName,
        rolePrivileges: [
          { privilegeName: "GROUPS_ALL", serviceId: "00haapch16h1ysv" },
        ],
      },
    });

    expect(createRes.roleId).toBeDefined();
    expect(createRes.roleName).toBe(testRoleName);

    const listRes = await listRoles(apiContext, { customerId: "my_customer" });
    const found = (
      listRes.items as Array<{ roleName?: string }> | undefined
    )?.find((r) => r.roleName === testRoleName);
    expect(found).toBeDefined();
  });

  it("should prevent duplicate role names", async () => {
    const dupeName = `DupeRole_${Date.now()}`;
    await postRole(apiContext, {
      customerId: "my_customer",
      body: {
        roleName: dupeName,
        rolePrivileges: [
          { privilegeName: "GROUPS_ALL", serviceId: "00haapch16h1ysv" },
        ],
      },
    });

    await expect(
      postRole(apiContext, {
        customerId: "my_customer",
        body: {
          roleName: dupeName,
          rolePrivileges: [
            { privilegeName: "GROUPS_ALL", serviceId: "00haapch16h1ysv" },
          ],
        },
      })
    ).rejects.toThrow();
  });

  it("should handle invalid customer ID", async () => {
    await expect(
      listRoles(apiContext, { customerId: "bad_customer" })
    ).rejects.toThrow();
  });

  it("should validate role body", async () => {
    await expect(
      postRole(apiContext, { customerId: "my_customer", body: {} })
    ).rejects.toThrow();
  });
});
