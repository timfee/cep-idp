import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

interface TrackedResource {
  type: 'google_user' | 'google_ou' | 'google_role' | 'google_saml_profile' |
        'microsoft_app' | 'microsoft_sp' | 'microsoft_policy';
  id: string;
  metadata?: Record<string, any>;
  createdAt: number;
}

export class TestResourceTracker {
  private resources: TrackedResource[] = [];
  private trackingFile = join(__dirname, '../../.test-resources.json');

  async track(type: TrackedResource['type'], id: string, metadata?: Record<string, any>) {
    const resource: TrackedResource = {
      type,
      id,
      metadata,
      createdAt: Date.now()
    };
    this.resources.push(resource);
    await this.persist();
    console.log(`[TRACKED] ${type}: ${id}`);
  }

  async persist() {
    await writeFile(this.trackingFile, JSON.stringify(this.resources, null, 2));
  }

  async load() {
    try {
      const data = await readFile(this.trackingFile, 'utf-8');
      this.resources = JSON.parse(data);
    } catch {
      this.resources = [];
    }
  }

  async cleanup(googleToken: string, microsoftToken: string) {
    await this.load();
    console.log(`[CLEANUP] Found ${this.resources.length} resources to clean up`);
    
    // Process in reverse order (delete dependents first)
    for (const resource of this.resources.reverse()) {
      try {
        await this.deleteResource(resource, googleToken, microsoftToken);
        console.log(`[CLEANUP] \u2713 Deleted ${resource.type}: ${resource.id}`);
      } catch (error) {
        console.error(`[CLEANUP] \u2717 Failed to delete ${resource.type}: ${resource.id}`, error);
      }
    }
    
    // Clear tracking file
    await unlink(this.trackingFile).catch(() => {});
  }

  private async deleteResource(resource: TrackedResource, googleToken: string, microsoftToken: string) {
    const deleteHandlers: Record<TrackedResource['type'], () => Promise<void>> = {
      google_user: async () => {
        await fetch(
          `https://admin.googleapis.com/admin/directory/v1/users/${encodeURIComponent(resource.id)}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${googleToken}` } }
        );
      },
      google_ou: async () => {
        await fetch(
          `https://admin.googleapis.com/admin/directory/v1/customer/my_customer/orgunits/${encodeURIComponent(resource.id)}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${googleToken}` } }
        );
      },
      google_role: async () => {
        await fetch(
          `https://admin.googleapis.com/admin/directory/v1/customer/my_customer/roles/${resource.id}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${googleToken}` } }
        );
      },
      google_saml_profile: async () => {
        await fetch(
          `https://cloudidentity.googleapis.com/v1/${resource.id}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${googleToken}` } }
        );
      },
      microsoft_app: async () => {
        await fetch(
          `https://graph.microsoft.com/v1.0/applications/${resource.id}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${microsoftToken}` } }
        );
      },
      microsoft_sp: async () => {
        await fetch(
          `https://graph.microsoft.com/v1.0/servicePrincipals/${resource.id}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${microsoftToken}` } }
        );
      },
      microsoft_policy: async () => {
        await fetch(
          `https://graph.microsoft.com/beta/policies/claimsMappingPolicies/${resource.id}`,
          { method: 'DELETE', headers: { Authorization: `Bearer ${microsoftToken}` } }
        );
      }
    };

    const handler = deleteHandlers[resource.type];
    if (handler) {
      await handler();
    }
  }

  getResources() {
    return [...this.resources];
  }
}

export const globalTracker = new TestResourceTracker();
