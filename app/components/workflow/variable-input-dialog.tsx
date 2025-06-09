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
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Alert, AlertDescription } from "../ui/alert";
import { setWorkflowVariable } from "@/app/actions/workflow-state";
import { validateVariable } from "@/app/lib/workflow";
import { Loader2 } from "lucide-react";

interface VariableInputDialogProps {
  variableName: string;
  title: string;
  description: string;
  placeholder?: string;
  validator?: string;
  isOpen: boolean;
  onComplete: () => void;
}

export function VariableInputDialog({
  variableName,
  title,
  description,
  placeholder,
  validator,
  isOpen,
  onComplete,
}: VariableInputDialogProps) {
  const [value, setValue] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!value.trim()) {
      setError("This field is required");
      return;
    }

    if (validator && !validateVariable(value, validator)) {
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
