import { getSamlSettings, patchSamlSettings } from '@/app/lib/workflow/endpoints/graph';
import { createLiveApiContext } from '../../../test-utils/live-api-context';

describe('SAML Settings - Live API', () => {
  let apiContext: ReturnType<typeof createLiveApiContext>;
  const servicePrincipalId = 'invalid';

  beforeAll(() => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;

    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: false
    });
  });

  it('should fail to get SAML settings', async () => {
    await expect(
      getSamlSettings(apiContext, { servicePrincipalId })
    ).rejects.toThrow();
  });

  it('should fail to patch SAML settings', async () => {
    await expect(
      patchSamlSettings(apiContext, { servicePrincipalId, body: {} })
    ).rejects.toThrow();
  });
});
