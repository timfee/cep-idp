"use client";
import "client-only";

import { setWorkflowVariable } from "@/app/actions/workflow-state";
import { validateVariable } from "@/app/lib/workflow";
import { Loader2 } from "lucide-react";
import { useState } from "react";
import { Alert, AlertDescription } from "../ui/alert";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";

interface VariableInputDialogProps {
  variableName: string;
  title: string;
  description: string;
  placeholder?: string;
  validator?: string;
  isOpen: boolean;
  onComplete: () => void;
}

/**
 * Modal dialog that prompts the operator to supply a value for an undefined
 * workflow variable.  The dialog validates the input against an optional
 * regex and invokes `onSubmit` only when the value passes validation.
 *
 * @param variableName - Name of the variable being edited
 * @param validator - Optional `RegExp` used to validate user input
 * @param onSubmit - Callback invoked with the validated value
 * @returns A Radix `Dialog` element
 */
export function VariableInputDialog({
  variableName,
  title,
  description,
  placeholder,
  validator,
  isOpen,
  onComplete
}: VariableInputDialogProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!value.trim()) {
      setError("This field is required");
      return;
    }

    const regex = typeof validator === "string" ? new RegExp(validator) : validator;
    if (validator && !validateVariable(value, regex)) {
      setError("Invalid format");
      return;
    }

    setLoading(true);
    try {
      const result = await setWorkflowVariable(variableName, value);
      if (result.success) {
        onComplete();
      } else {
        setError(result.error || "Failed to save");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="value">Value</Label>
            <Input
              id="value"
              value={value}
              onChange={(e) => {
                setValue(e.target.value);
                setError("");
              }}
              placeholder={placeholder}
              className={error ? "border-red-500" : ""}
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>

          <Alert>
            <AlertDescription>
              This value will be saved and used in subsequent workflow steps.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={loading || !value.trim()}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
