import { appByTemplateProv, appByTemplateSSO } from '@/app/lib/workflow/endpoints/graph';
import { createLiveApiContext } from '../../../test-utils/live-api-context';

describe('Applications by Template - Live API', () => {
  let apiContext: ReturnType<typeof createLiveApiContext>;
  const GOOGLE_TEMPLATE_ID = '01303a13-8322-4e06-bee5-80d612907131';

  beforeAll(() => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;

    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: false
    });
  });

  it('should fail to list apps by provisioning template', async () => {
    await expect(
      appByTemplateProv(apiContext, {
        provisioningTemplateId: GOOGLE_TEMPLATE_ID
      })
    ).rejects.toThrow();
  });

  it('should fail to list apps by SSO template', async () => {
    await expect(
      appByTemplateSSO(apiContext, {
        ssoTemplateId: GOOGLE_TEMPLATE_ID
      })
    ).rejects.toThrow();
  });
});
