import { getOU, postOU } from "@/app/lib/workflow/endpoints/admin";
import { createLiveApiContext } from "../../helpers/live-api-context";
import { sleep } from "../../helpers/sleep";

describe("Org Units - Live API", () => {
  // Google's Admin SDK can take several seconds to propagate newly created
  // organisational units.  The default Jest timeout of 5 seconds is therefore
  // too aggressive and would cause this suite to fail intermittently.  A more
  // forgiving 20 second budget keeps the tests reliable while still
  // surfacing genuine hangs.
  jest.setTimeout(20000);

  let apiContext: ReturnType<typeof createLiveApiContext>;
  const testOuName = `TestOU_${Date.now()}`;
  const testOuPath = `${testOuName}`;

  beforeAll(() => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;

    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: true
    });
  });

  it("should create and retrieve an org unit", async () => {
    // Create OU
    const createResult = await postOU(apiContext, {
      customerId: "my_customer",
      body: { name: testOuName, parentOrgUnitPath: "/" }
    });

    expect(createResult).toHaveProperty("orgUnitId");
    expect(createResult.name).toBe(testOuName);

    // Verify it exists
    // Give Google's distributed systems a moment to register the new OU.
    // Two seconds was occasionally insufficient, causing flaky 404s.
    await sleep(5000); // Increased delay for eventual consistency

    const getResult = await getOU(apiContext, {
      customerId: "my_customer",
      orgUnitPath: testOuPath
    });

    expect(getResult.orgUnitPath).toBe(`/${testOuPath}`);
  });

  it("should handle duplicate OU creation", async () => {
    const duplicateName = `DupeOU_${Date.now()}`;

    // Create first
    await postOU(apiContext, {
      customerId: "my_customer",
      body: { name: duplicateName, parentOrgUnitPath: "/" }
    });

    // Try to create duplicate
    await expect(
      postOU(apiContext, {
        customerId: "my_customer",
        body: { name: duplicateName, parentOrgUnitPath: "/" }
      })
    ).rejects.toThrow();
  });
});
