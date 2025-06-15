#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

const bodyMappings = {
  "post-ou.ts": "CreateOrgUnitBodySchema",
  "post-role.ts": "CreateRoleBodySchema",
  "post-role-assign.ts": "RoleAssignmentBodySchema",
  "update-user.ts": "UpdateUserBodySchema",
  "create-saml-profile.ts": "CreateSamlProfileBodySchema",
  "add-idp-cert.ts": "AddIdpCertBodySchema",
  "post-sso-assignment.ts": "PostSsoAssignmentBodySchema",
  "create-policy.ts": "CreatePolicyBodySchema",
  "link-policy.ts": "LinkPolicyBodySchema",
  "patch-saml-settings.ts": "PatchSamlSettingsBodySchema",
  "patch-sync.ts": "PatchSyncBodySchema",
};

Object.entries(bodyMappings).forEach(([filename, schemaName]) => {
  const files = [
    path.join(__dirname, "../app/lib/workflow/endpoints/admin/", filename),
    path.join(__dirname, "../app/lib/workflow/endpoints/ci/", filename),
    path.join(__dirname, "../app/lib/workflow/endpoints/graph/", filename),
  ];

  files.forEach((filepath) => {
    if (fs.existsSync(filepath)) {
      let content = fs.readFileSync(filepath, "utf8");

      // Add import
      if (!content.includes("schemas/requests")) {
        content = content.replace(
          'import { createEndpoint } from "../factory";',
          `import { createEndpoint } from "../factory";\nimport { ${schemaName} } from "../../schemas/requests";`
        );
      }

      // Replace body schema
      content = content.replace(
        "body: z.record(z.unknown())",
        `body: ${schemaName}`
      );

      fs.writeFileSync(filepath, content);
      console.log(`✓ Fixed ${filename}`);
    }
  });
});
