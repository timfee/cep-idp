"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { ManualStepGuide } from "./manual-step-guide";
import { Step } from "@/app/lib/workflow";

interface ManualStepDialogProps {
  step: Step;
  variables: Record<string, string>;
  isOpen: boolean;
  onComplete: () => void;
}

export function ManualStepDialog({
  step,
  variables,
  isOpen,
  onComplete,
}: ManualStepDialogProps) {
  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{step.name}</DialogTitle>
          <DialogDescription>
            Complete the following steps in your Azure Portal
          </DialogDescription>
        </DialogHeader>

        <ManualStepGuide step={step} variables={variables} onComplete={onComplete} />
      </DialogContent>
    </Dialog>
  );
}

