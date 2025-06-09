"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { Textarea } from "../ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Label } from "../ui/label";
import { Input } from "../ui/input";
import { Alert, AlertDescription } from "../ui/alert";
import { ExternalLink, Loader2 } from "lucide-react";
import { setWorkflowVariable } from "@/app/actions/workflow-state";
import { Step } from "@/app/lib/workflow";

interface ManualStepModalProps {
  step: Step;
  isOpen: boolean;
  onComplete: () => void;
}

export function ManualStepModal({
  step,
  isOpen,
  onComplete,
}: ManualStepModalProps) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const newErrors: Record<string, string> = {};
    for (const output of step.outputs || []) {
      if (!values[output]) {
        newErrors[output] = "This field is required";
      }
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setLoading(true);
    try {
      for (const [key, value] of Object.entries(values)) {
        const result = await setWorkflowVariable(key, value);
        if (!result.success) {
          throw new Error(result.error);
        }
      }
      onComplete();
    } catch (error) {
      console.error("Failed to save values:", error);
      setErrors({ _general: "Failed to save values" });
    } finally {
      setLoading(false);
    }
  };

  if (step.name === "Add Microsoft Identity Certificate") {
    return (
      <Dialog open={isOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{step.name}</DialogTitle>
            <DialogDescription>{step.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <AlertDescription>
                <ol className="list-decimal list-inside space-y-2 text-sm">
                  <li>Go to Azure Portal → Enterprise Applications</li>
                  <li>Select your SSO app (not the provisioning app)</li>
                  <li>
                    Click &quot;Single sign-on&quot; → &quot;SAML Signing
                    Certificate&quot;
                  </li>
                  <li>Download &quot;Certificate (Base64)&quot;</li>
                  <li>Open the downloaded .cer file in a text editor</li>
                  <li>Copy and paste the entire contents below</li>
                </ol>
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="cert">SAML Signing Certificate</Label>
              <Textarea
                id="cert"
                placeholder="-----BEGIN CERTIFICATE-----\nMIIDdzCCAl+gAwIBAgIEAgAAuTANBgkqhkiG9w0BAQUFADBaMQswCQ...\n-----END CERTIFICATE-----"
                className="font-mono text-xs h-48"
                value={values.samlCertificate || ""}
                onChange={(e) => {
                  setValues({ ...values, samlCertificate: e.target.value });
                  setErrors({ ...errors, samlCertificate: "" });
                }}
              />
              {errors.samlCertificate && (
                <p className="text-sm text-red-500">{errors.samlCertificate}</p>
              )}
            </div>

            <Button variant="link" asChild className="w-full">
              <a
                href="https://portal.azure.com/#blade/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/AllApps"
                target="_blank"
                rel="noopener noreferrer"
              >
                Open Azure Portal
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={loading || !values.samlCertificate}
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  if (step.name === "Assign Users to SSO App") {
    return (
      <Dialog open={isOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{step.name}</DialogTitle>
            <DialogDescription>{step.description}</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert>
              <AlertDescription>
                Choose who can sign in to Google Workspace using Microsoft
                credentials. For most organizations, selecting &quot;All
                Users&quot; is recommended.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Label htmlFor="principal">Select Users or Groups</Label>
              <Select
                value={values.principalId || ""}
                onValueChange={(value) => {
                  setValues({ ...values, principalId: value });
                  setErrors({ ...errors, principalId: "" });
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose an option" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-users">
                    All Users (Recommended)
                  </SelectItem>
                  <SelectItem value="custom">
                    Enter Custom Principal ID
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {values.principalId === "custom" && (
              <div className="space-y-2">
                <Label htmlFor="customId">Principal ID (from Azure)</Label>
                <Input
                  id="customId"
                  placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                  value={values.customPrincipalId || ""}
                  onChange={(e) => {
                    setValues({ ...values, customPrincipalId: e.target.value });
                  }}
                />
                <p className="text-xs text-muted-foreground">
                  Find this in Azure Portal → Groups/Users → Object ID
                </p>
              </div>
            )}

            <Button variant="link" asChild className="w-full">
              <a
                href="https://portal.azure.com/#blade/Microsoft_AAD_IAM/GroupsManagementMenuBlade/AllGroups"
                target="_blank"
                rel="noopener noreferrer"
              >
                Browse Groups in Azure Portal
                <ExternalLink className="ml-2 h-4 w-4" />
              </a>
            </Button>
          </div>

          <DialogFooter>
            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                !values.principalId ||
                (values.principalId === "custom" && !values.customPrincipalId)
              }
            >
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
