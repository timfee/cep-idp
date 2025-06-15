import { getSync, patchSync, startSyncJob } from '@/app/lib/workflow/endpoints/graph';
import { createLiveApiContext } from '../../setup/live-api-context';

describe('Sync - Live API', () => {
  let apiContext: ReturnType<typeof createLiveApiContext>;
  const testServicePrincipalId = 'invalid';
  const testJobId = 'invalid';

  beforeAll(() => {
    const googleToken = process.env.GOOGLE_ACCESS_TOKEN!;
    const microsoftToken = process.env.MICROSOFT_ACCESS_TOKEN!;

    apiContext = createLiveApiContext({
      googleToken,
      microsoftToken,
      trackCreatedResources: false
    });
  });

  it('should fail to get sync configuration', async () => {
    await expect(
      getSync(apiContext, { servicePrincipalId: testServicePrincipalId })
    ).rejects.toThrow();
  });

  it('should fail to patch sync configuration', async () => {
    await expect(
      patchSync(apiContext, {
        servicePrincipalId: testServicePrincipalId,
        body: {
          secrets: [
            {
              key: 'BaseAddress',
              value: 'https://admin.googleapis.com/admin/directory/v1'
            }
          ]
        }
      })
    ).rejects.toThrow();
  });

  it('should fail to start sync job', async () => {
    await expect(
      startSyncJob(apiContext, {
        servicePrincipalId: testServicePrincipalId,
        jobId: testJobId
      })
    ).rejects.toThrow();
  });
});
