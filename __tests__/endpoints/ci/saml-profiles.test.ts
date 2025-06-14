import { listSamlProfiles, createSamlProfile, getIdpCreds } from '@/app/lib/workflow/endpoints/ci';
import { createLiveApiContext } from '../../setup/live-api-context';

describe('SAML Profiles - Live API', () => {
  let apiContext: ReturnType<typeof createLiveApiContext>;
  let testProfileId: string;
  
  beforeAll(() => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;
    
    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: true
    });
  });

  it('should create and list SAML profiles', async () => {
    // Create profile
    const createResult = await createSamlProfile(apiContext, {
      body: {
        displayName: `Test SAML ${Date.now()}`,
        idpConfig: {
          entityId: `https://test.example.com/${Date.now()}`,
          singleSignOnServiceUri: 'https://test.example.com/sso'
        }
      }
    });
    
    expect(createResult.done).toBe(true);
    expect(createResult.response).toBeDefined();
    testProfileId = createResult.response.name;
    
    // List profiles
    const listResult = await listSamlProfiles(apiContext, {});
    expect(listResult.inboundSamlSsoProfiles).toBeDefined();
    
    const found = listResult.inboundSamlSsoProfiles?.find(
      (p: any) => p.name === testProfileId
    );
    expect(found).toBeDefined();
  });

  it('should handle missing credentials gracefully', async () => {
    if (testProfileId) {
      const profileId = testProfileId.split('/').pop() as string;
      const result = await getIdpCreds(apiContext, {
        samlProfileId: profileId
      });
      
      // Might be empty initially
      expect(result).toBeDefined();
    }
  });
});
