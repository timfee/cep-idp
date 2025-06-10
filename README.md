# CEP Identity Federation Automater

## 1. Introduction & Vision

### 1.1. Problem Statement

Large enterprises adopting Chrome Enterprise Premium (CEP) often use an established, non-Google Identity Provider (IdP) such as Microsoft Entra ID. To unlock the full value of CEP—specifically advanced security features like context-aware access, threat detection, and detailed reporting—Google must be aware of the user identities within the organization. The process of synchronizing these identities and configuring single sign-on (SSO) federation is a significant manual effort, requiring deep expertise across both Google and Microsoft cloud ecosystems and creating a barrier to CEP adoption.

### 1.2. Vision & Goal

This product is a guided, semi-automated onboarding tool designed to dramatically simplify the identity setup for Chrome Enterprise Premium. The goal is to provide a minimally intrusive workflow that enables administrators to synchronize user identities from Microsoft Entra ID to Google Workspace and establish SSO federation. By automating this complex process, we can accelerate CEP adoption, reduce configuration errors, and allow customers to realize the value of their investment faster.

## 2. User Personas & Target Audience

### Primary Persona: The "CEP Champion"

An administrator at a large enterprise (e.g., Chrome Admin, Security Admin, IT Project Manager) who is tasked with the successful implementation of Chrome Enterprise Premium. Their organization is strategically committed to using Microsoft Entra ID as its primary IdP.

#### Goals

- To get user identities provisioned into their Google tenant to enable advanced CEP features.

- To configure SSO so that employees have a seamless, familiar login experience via their existing Microsoft credentials.

- To complete the identity setup with minimal disruption to end-users and existing infrastructure.

#### Challenges & Environment

- The CEP Champion is an expert in their domain (e.g., Chrome) but may not be a Super Admin in both Google Workspace and Microsoft Entra ID.

- They may need to coordinate with other teams or administrators who hold the required privileges (e.g., a dedicated Microsoft Global Administrator or a Google Workspace User Admin).

- Their success depends on their ability to either execute the necessary steps themselves or clearly articulate the required actions to other administrators.

## 3. Core Features & User Flow

The application guides the CEP Champion through the federation setup, gracefully handling the complexities of a multi-admin environment.

### 3.1. User Flow

1. **Onboarding & Authentication:** The CEP Champion lands on the workflow page. They are prompted to authenticate with both their Google and Microsoft accounts. The system will use the permissions they have been granted.
2. **Step-by-Step Execution:** The interface presents the series of steps.
   - Nice to have: Steps that cannot be completed with the Champion's current permissions are disabled with a short message explaining why. For example: _"This action requires the 'Role Management Administrator' privilege in Google Workspace. Please run this step with a user who has this privilege, or delegate this task to the appropriate administrator."_
3. **Stateful Progression:** The application's state (completed steps, extracted variables like domain names and IDs) is maintained using client-side state management. Because the status of each step can be ascertained by READ API calls, it’s not critical to persist the entirety of the workflow in any sophisticated way.
4. **Completion:** The workflow is complete once all technical steps are marked “completed.”

### 3.2. Workflow Step Order

1. Verify Primary Domain
2. Create Automation Organizational Unit
3. Create Service Account for Microsoft
4. Create Custom Admin Role
5. Assign Admin Role to Service Account
6. Create SAML Profile for SSO
7. Create Microsoft Provisioning App
8. Configure User Provisioning
9. Create Microsoft SSO App
10. Add Microsoft Identity Certificate
11. Start User Synchronization
12. Configure SAML Settings
13. Create Claims Mapping Policy
14. Assign Users to SSO App (manual)
15. Enable SSO for Organization
16. Disable SSO for Service Accounts
17. Test SSO Configuration (manual)

## 4. Functional Requirements

### 4.1. Workflow Engine

- **Declarative Workflow:** All steps must be defined in the external `workflow.json` file to separate logic from the application code.
- **Dependency Management:** The engine must strictly enforce the step execution order based on the `depends_on` array.
- **Permission-Aware Error Handling:** The engine must be able to interpret common API error codes (especially `401 Unauthorized` and `403 Forbidden`) and map them to user-friendly, actionable error messages related to insufficient privileges.
- **Verification and Execution:** Each step must support distinct `verify` (read-only checks) and `execute` (write operations) action sets. In some cases, an error code may not indicate irregular operations (for instance `404 Not Found` would be acceptable if a user account hasn’t been created yet).

## 4.2. State Management

- **Volatile Persistence:** In this MVP, state is managed with `useState` (or similar) client side to track variables and step completion. This state is **not** persisted across server restarts. A user, or set of collaborating administrators, must complete the workflow within a single continuous server session.
  - This is acceptable given that the state can be reconstituted relatively easily upon page load using READ APIs.

## 4.3. Authentication & Authorization

- **Multi-Provider OAuth:** Must handle separate, secure OAuth 2.0 flows for Google and Microsoft. Note that Google requires explicit `consent` style grants due to the sensitivity of the tokens.
- **Secure Token Handling:** Access tokens must be stored securely in encrypted, chunked, HTTP-only cookies.
- The system should detect and attempt to re-acquire expired tokens. If unsuccessful, the user should be notified and allowed to re-authenticate.

## 4.4. UI & User Experience

- **Clarity and Guidance:** The UI must clearly articulate the purpose of each step and its current status.
- **Actionable Feedback:** Error messages must be specific and helpful, guiding the CEP Champion on how to resolve permission-based blockers.
- **Transparency:** The "Variable Viewer" sidebar provides crucial transparency into the data being collected and used throughout the workflow.

## 5. Non-Functional Requirements

- **Security:** Follows best practices for handling OAuth flows and API tokens. All sensitive configuration is server-side.
- **Usability:** Designed to simplify a highly complex task for a technical administrator who may not be an expert in all required domains. The tool serves as both an automation engine and an interactive guide.

## 6. Out of Scope / Future Work

- **Delegatable Tasks:** To further streamline collaboration, a future release could introduce a "delegation" feature. A CEP Champion could generate a secure, single-use URL for a specific step (e.g., 'Create Microsoft Enterprise App') and send it to the administrator with the correct permissions. That admin could then authorize the app and complete just that single step without needing access to the full workflow.

## 7. Development Quickstart

Run linting and static verification before submitting patches:

```bash
npm run lint
npx tsx verify-fixes.ts
```
