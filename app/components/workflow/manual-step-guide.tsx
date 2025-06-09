"use client";

import { useState } from "react";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Checkbox } from "../ui/checkbox";
import { ExternalLink, Info, CheckCircle2, Copy } from "lucide-react";
import { Step } from "@/app/lib/workflow";
import { cn } from "@/app/lib/utils";

interface ManualStepGuideProps {
  step: Step;
  variables: Record<string, string>;
  onComplete: () => void;
}

interface StepInstruction {
  text: string;
  code?: string;
  link?: { url: string; text: string };
  important?: boolean;
}

export function ManualStepGuide({
  step,
  variables,
  onComplete,
}: ManualStepGuideProps) {
  const [checkedSteps, setCheckedSteps] = useState<Set<number>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, id: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getInstructions = (): StepInstruction[] => {
    switch (step.name) {
      case "Assign Users to SSO App":
        return [
          {
            text: "Open Azure Portal and navigate to your SSO Enterprise Application",
            link: {
              url: "https://portal.azure.com/#blade/Microsoft_AAD_IAM/StartboardApplicationsMenuBlade/AllApps",
              text: "Open Azure Portal",
            },
          },
          {
            text: "Click on 'Users and groups' in the left menu",
          },
          {
            text: "Click 'Add user/group' button",
            important: true,
          },
          {
            text: "Choose one of these options:",
            important: true,
          },
          {
            text: "Option A: Add specific users or groups who need Google Workspace access",
          },
          {
            text: "Option B: Add 'All Users' group for organization-wide access (recommended for most setups)",
          },
          {
            text: "If adding a group, copy this Object ID for later use:",
            code: variables.principalId || "Will be set after selection",
          },
          {
            text: "Click 'Select' and then 'Assign' to save your changes",
          },
        ];

      case "Test SSO Configuration":
        return [
          {
            text: "Open an incognito/private browser window",
          },
          {
            text: "Navigate to any Google Workspace service:",
            link: { url: "https://mail.google.com", text: "Try Gmail" },
          },
          {
            text: "Enter an email address from your domain:",
            code: `user@${variables.primaryDomain || "yourdomain.com"}`,
          },
          {
            text: "You should be redirected to Microsoft login",
          },
          {
            text: "Sign in with your Microsoft credentials",
          },
          {
            text: "Verify you're successfully logged into Google Workspace",
            important: true,
          },
          {
            text: "If login fails, check the SAML response in browser dev tools (Network tab)",
          },
        ];

      default:
        return [
          {
            text: step.description || "Complete this step manually",
            important: true,
          },
        ];
    }
  };

  const instructions = getInstructions();
  const allStepsChecked = checkedSteps.size === instructions.length;

  const toggleStep = (index: number) => {
    const newChecked = new Set(checkedSteps);
    if (newChecked.has(index)) {
      newChecked.delete(index);
    } else {
      newChecked.add(index);
    }
    setCheckedSteps(newChecked);
  };

  return (
    <Card className="border-blue-200 dark:border-blue-800">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5 text-blue-600" />
          Manual Configuration Required
        </CardTitle>
        <CardDescription>{step.description}</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert>
          <AlertDescription>
            Follow these steps in order. Check each box as you complete the
            step.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          {instructions.map((instruction, index) => (
            <div
              key={index}
              className={cn(
                "flex gap-3 p-3 rounded-lg transition-colors",
                checkedSteps.has(index)
                  ? "bg-green-50 dark:bg-green-950/20"
                  : "bg-gray-50 dark:bg-gray-900",
              )}
            >
              <Checkbox
                checked={checkedSteps.has(index)}
                onCheckedChange={() => toggleStep(index)}
                className="mt-0.5"
              />

              <div className="flex-1 space-y-2">
                <p
                  className={cn(
                    "text-sm",
                    instruction.important && "font-medium",
                    checkedSteps.has(index) && "line-through opacity-60",
                  )}
                >
                  {instruction.text}
                </p>

                {instruction.code && (
                  <div className="flex items-center gap-2">
                    <code className="flex-1 bg-white dark:bg-zinc-800 px-3 py-1.5 rounded border text-xs font-mono">
                      {instruction.code}
                    </code>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        copyToClipboard(instruction.code!, `code-${index}`)
                      }
                    >
                      {copied === `code-${index}` ? (
                        <CheckCircle2 className="h-3 w-3" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                )}

                {instruction.link && (
                  <Button
                    variant="link"
                    size="sm"
                    className="h-auto p-0 text-blue-600"
                    asChild
                  >
                    <a
                      href={instruction.link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {instruction.link.text}
                      <ExternalLink className="ml-1 h-3 w-3" />
                    </a>
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        {step.name === "Assign Users to SSO App" && (
          <Alert className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
            <AlertDescription>
              <strong>Tip:</strong> For initial testing, add yourself or a test
              user. You can add more users or groups later without re-running
              this workflow.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>

      <CardFooter>
        <Button
          onClick={onComplete}
          disabled={!allStepsChecked}
          className="w-full"
        >
          {allStepsChecked ? (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Mark as Complete
            </>
          ) : (
            <>
              Complete All Steps First
              <span className="ml-2 text-xs opacity-60">
                ({checkedSteps.size}/{instructions.length})
              </span>
            </>
          )}
        </Button>
      </CardFooter>
    </Card>
  );
}
