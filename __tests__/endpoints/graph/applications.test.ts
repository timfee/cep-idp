import { instantiateProv, instantiateSSO, listAppTemplates } from '@/app/lib/workflow/endpoints/graph';
import { createLiveApiContext } from '../../setup/live-api-context';

describe('Applications - Live API', () => {
  let apiContext: ReturnType<typeof createLiveApiContext>;
  const GOOGLE_TEMPLATE_ID = '01303a13-8322-4e06-bee5-80d612907131';
  
  beforeAll(() => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;
    
    if (!microsoftToken) {
      throw new Error('MICROSOFT_ACCESS_TOKEN not set');
    }
    
    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: true
    });
  });

  it('should fail to list templates with invalid version', async () => {
    await expect(listAppTemplates(apiContext, {})).rejects.toThrow();
  });

  it('should fail to instantiate provisioning app', async () => {
    await expect(
      instantiateProv(apiContext, {
        provisioningTemplateId: GOOGLE_TEMPLATE_ID
      })
    ).rejects.toThrow();
  });

  it('should fail to instantiate SSO app', async () => {
    await expect(
      instantiateSSO(apiContext, { ssoTemplateId: GOOGLE_TEMPLATE_ID })
    ).rejects.toThrow();
  });
});
