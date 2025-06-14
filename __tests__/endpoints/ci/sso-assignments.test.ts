import { listSsoAssignments } from '@/app/lib/workflow/endpoints/ci';
import { createLiveApiContext } from '../../setup/live-api-context';

describe('SSO Assignments - Live API', () => {
  let apiContext: ReturnType<typeof createLiveApiContext>;
  
  beforeAll(() => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;
    
    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: true
    });
  });

  it('should list SSO assignments', async () => {
    const result = await listSsoAssignments(apiContext, {});
    
    expect(result).toBeDefined();
    // May or may not have assignments
    if (result.inboundSsoAssignments) {
      expect(Array.isArray(result.inboundSsoAssignments)).toBe(true);
    }
  });

  // Note: Creating SSO assignments requires a valid SAML profile
  // This would be tested in integration tests
});
