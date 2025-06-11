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
