import { createPolicy, linkPolicy, listPolicies } from '@/app/lib/workflow/endpoints/graph';
import { createLiveApiContext } from '../../helpers/live-api-context';

describe('Policies - Live API', () => {
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

  it('should fail to create claims policy', async () => {
    await expect(
      createPolicy(apiContext, {
        body: {
          definition: [
            JSON.stringify({
              ClaimsMappingPolicy: {
                Version: 1,
                IncludeBasicClaimSet: true,
                ClaimsSchema: []
              }
            })
          ],
          displayName: `Test Policy ${Date.now()}`,
          isOrganizationDefault: false
        }
      })
    ).rejects.toThrow();
  });

  it('should fail to link policy', async () => {
    await expect(
      linkPolicy(apiContext, {
        servicePrincipalId: 'invalid',
        body: { '@odata.id': 'invalid' }
      })
    ).rejects.toThrow();
  });

  it('should fail to list linked policies', async () => {
    await expect(
      listPolicies(apiContext, { servicePrincipalId: 'invalid' })
    ).rejects.toThrow();
  });
});
