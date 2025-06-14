import {
  getRoleAssign,
  postRole,
  postRoleAssign,
  postUser
} from "@/app/lib/workflow/endpoints/admin";
import { createLiveApiContext } from "../../../test-utils/live-api-context";

describe("Role Assignments - Live API", () => {
  let apiContext: ReturnType<typeof createLiveApiContext>;
  let roleId: string;
  let userId: string;
  let assignmentId: string;
  let primaryDomain: string;

  beforeAll(async () => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;

    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: true
    });

    // create a user
    // Defers the import until inside the live-API test so the production
    // bundle is not affected and avoids any potential circular-dependency at
    // module-initialisation time.
    const { listDomains } = await import("@/app/lib/workflow/endpoints/admin");
    const domains = await listDomains(apiContext, {
      customerId: "my_customer"
    });
    primaryDomain = (
      domains.domains as Array<{ domainName: string; isPrimary?: boolean }>
    ).find((d) => d.isPrimary)!.domainName;

    const userRes = await postUser(apiContext, {
      body: {
        primaryEmail: `assignuser${Date.now()}@${primaryDomain}`,
        password: `TempPass${Date.now()}!`,
        name: { givenName: "Assign", familyName: "User" }
      }
    });
    userId = userRes.id;

    // create a role
    const roleRes = await postRole(apiContext, {
      customerId: "my_customer",
      body: {
        roleName: `AssignRole_${Date.now()}`,
        rolePrivileges: [
          { privilegeName: "GROUPS_ALL", serviceId: "00haapch16h1ysv" }
        ]
      }
    });
    roleId = roleRes.roleId;
  });

  afterAll(async () => {
    if (assignmentId) {
      const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
      await fetch(
        `https://admin.googleapis.com/admin/directory/v1/customer/my_customer/roleassignments/${assignmentId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${googleToken}` }
        }
      ).catch(() => {});
    }
  });

  it("should create and retrieve a role assignment", async () => {
    const assignRes = await postRoleAssign(apiContext, {
      customerId: "my_customer",
      body: {
        roleId,
        assignedTo: userId,
        assigneeType: "user",
        scopeType: "CUSTOMER"
      }
    });

    assignmentId = assignRes.roleAssignmentId;
    expect(assignRes.roleId).toBe(roleId);
    expect(assignRes.assignedTo).toBe(userId);

    const listRes = await getRoleAssign(apiContext, {
      customerId: "my_customer",
      roleId,
      assignedTo: userId
    });

    expect(Array.isArray(listRes.items)).toBe(true);
    const found = (listRes.items as Array<{ roleAssignmentId: string }>).find(
      (i) => i.roleAssignmentId === assignmentId
    );
    expect(found).toBeDefined();
  });

  it("should prevent duplicate assignments", async () => {
    await postRoleAssign(apiContext, {
      customerId: "my_customer",
      body: {
        roleId,
        assignedTo: userId,
        assigneeType: "user",
        scopeType: "CUSTOMER"
      }
    });

    await expect(
      postRoleAssign(apiContext, {
        customerId: "my_customer",
        body: {
          roleId,
          assignedTo: userId,
          assigneeType: "user",
          scopeType: "CUSTOMER"
        }
      })
    ).rejects.toThrow();
  });

  it("should handle invalid role", async () => {
    await expect(
      postRoleAssign(apiContext, {
        customerId: "my_customer",
        body: {
          roleId: "123",
          assignedTo: userId,
          assigneeType: "user",
          scopeType: "CUSTOMER"
        }
      })
    ).rejects.toThrow();
  });
});
