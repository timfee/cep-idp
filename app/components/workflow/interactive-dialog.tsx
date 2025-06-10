"use client";
import "client-only";

import { useState } from "react";
import { Button } from "../ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Alert, AlertDescription, AlertTitle } from "../ui/alert";
import { Loader2, Plus, RefreshCw, Key } from "lucide-react";
import { InteractiveRequest } from "@/app/lib/workflow";
import { validateVariable } from "@/app/lib/workflow";

interface InteractiveDialogProps {
  request: InteractiveRequest;
  isOpen: boolean;
  onComplete: (response: { value: string; metadata?: Record<string, string> }) => void;
  onCancel: () => void;
}

interface CreateFieldConfig {
  name: string;
  type?: "text" | "password" | "email";
  validator?: string;
  generator?: string;
  default?: string;
  label?: string;
}

const DEFAULT_PASSWORD_LENGTH = 16;

/**
 * Generate a cryptographically secure random password.
 *
 * @param length - Desired password length
 * @returns A randomly generated password string
 */
function generatePassword(length: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  const values = new Uint32Array(length);
  crypto.getRandomValues(values);
  let password = "";
  for (let i = 0; i < length; i++) {
    password += chars[values[i] % chars.length];
  }
  return password;
}

/**
 * Dialog for collecting user input required by an interactive workflow action.
 *
 * @param props - Dialog configuration and callbacks
 */
export function InteractiveDialog({
  request,
  isOpen,
  onComplete,
  onCancel,
}: InteractiveDialogProps) {
  const { config, options = [] } = request;
  const [mode, setMode] = useState<"select" | "create">(
    config.type === "create" ? "create" : "select"
  );
  const [selectedValue, setSelectedValue] = useState(config.default || "");
  const [createFields, setCreateFields] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const [passwordMode, setPasswordMode] = useState<"input" | "reset">("input");
  const [existingPassword, setExistingPassword] = useState("");

  /**
   * Update the value of a field in the create form and clear any error.
   *
   * @param fieldName - Name of the field being edited
   * @param value - New field value
   */
  const handleCreateFieldChange = (fieldName: string, value: string) => {
    setCreateFields({ ...createFields, [fieldName]: value });
    setErrors({ ...errors, [fieldName]: "" });
  };

  /**
   * Generate a value for a form field based on its configured generator.
   *
   * Currently only supports `randomPassword(length)` generators.
   *
   * @param field - Field configuration
   * @returns Generated value or empty string if unsupported
   */
  const generateFieldValue = (field: CreateFieldConfig) => {
    if (field.generator?.startsWith("randomPassword(")) {
      const match = field.generator.match(/randomPassword\((\d+)\)/);
      if (match) {
        return generatePassword(parseInt(match[1], 10));
      }
    }
    return "";
  };

  /**
   * Validate the current form data before submitting.
   *
   * @returns `true` if all fields are valid
   */
  const validateFields = (): boolean => {
    if (mode === "select") {
      if (!selectedValue) {
        setErrors({ select: "Please select an option" });
        return false;
      }
      if (config.requiresPassword && passwordMode === "input" && !existingPassword) {
        // eslint-disable-next-line sonarjs/no-hardcoded-passwords
        setErrors({ pwd: "Password is required" });
        return false;
      }
      return true;
    }

    const newErrors: Record<string, string> = {};
    const createOpt = config.createOption;
    if (typeof createOpt === "object" && createOpt.fields) {
      for (const field of createOpt.fields) {
        const value = createFields[field.name];
        if (!value && !field.generator) {
          newErrors[field.name] = "This field is required";
        }
        if (value && field.validator && !validateVariable(value, field.validator)) {
          newErrors[field.name] = `Invalid format for ${field.label || field.name}`;
        }
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /**
   * Submit the dialog response to the parent component.
   *
   * Handles both "select" and "create" modes and adds any metadata
   * required by the server.
   */
  const handleSubmit = () => {
    if (!validateFields()) return;
    setLoading(true);

    if (mode === "select") {
      const metadata: Record<string, string> = {};
      if (config.requiresPassword) {
        if (passwordMode === "reset") {
          const newPassword = generatePassword(DEFAULT_PASSWORD_LENGTH);
          metadata.generatedPassword = newPassword;
          // eslint-disable-next-line sonarjs/no-hardcoded-passwords
          metadata.passwordAction = "reset";
        } else {
          metadata.generatedPassword = existingPassword;
          // eslint-disable-next-line sonarjs/no-hardcoded-passwords
          metadata.passwordAction = "existing";
        }
      }
      metadata[`${config.variable}_existing`] = "true";
      onComplete({ value: selectedValue, metadata });
    } else {
      const createOpt = config.createOption;
      if (typeof createOpt === "object" && createOpt.fields) {
        const finalFields = { ...createFields };
        for (const field of createOpt.fields) {
          if (!finalFields[field.name] && field.generator) {
            finalFields[field.name] = generateFieldValue(field);
          }
        }
        let value = finalFields[createOpt.fields[0].name];
        if (createOpt.transform) {
          value = createOpt.transform.replace("{value}", value);
        }
          // eslint-disable-next-line sonarjs/no-hardcoded-passwords
          finalFields.passwordAction = "create";
        onComplete({ value, metadata: finalFields });
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{config.prompt}</DialogTitle>
          <DialogDescription>
            {config.type === "select-or-create" &&
              "Choose an existing option or create a new one."}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {config.type === "select-or-create" && (
            <div className="flex gap-2">
              <Button
                variant={mode === "select" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("select")}
              >
                Select Existing
              </Button>
              <Button
                variant={mode === "create" ? "default" : "outline"}
                size="sm"
                onClick={() => setMode("create")}
              >
                <Plus className="h-4 w-4 mr-1" />
                Create New
              </Button>
            </div>
          )}

          {mode === "select" && config.type !== "create" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Select an option</Label>
                <Select value={selectedValue} onValueChange={setSelectedValue}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose an option..." />
                  </SelectTrigger>
                  <SelectContent>
                    {options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.select && (
                  <p className="text-sm text-red-500">{errors.select}</p>
                )}
              </div>

              {config.requiresPassword && selectedValue && (
                <div className="mt-4 p-4 border rounded-lg space-y-4 bg-muted/50">
                  <Label className="text-base font-medium">
                    Password for existing account
                  </Label>
                  <div className="flex gap-2">
                    <Button
                      variant={passwordMode === "input" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setPasswordMode("input")}
                    >
                      <Key className="h-4 w-4 mr-1" />
                      Enter Password
                    </Button>
                    <Button
                      variant={passwordMode === "reset" ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        setPasswordMode("reset");
                        setExistingPassword("");
                      }}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      Reset Password
                    </Button>
                  </div>
                  {passwordMode === "input" && (
                    <div className="space-y-2">
                      <Input
                        type="password"
                        placeholder="Enter the current password"
                        value={existingPassword}
                        onChange={(e) => {
                          setExistingPassword(e.target.value);
                          setErrors({ ...errors, pwd: "" });
                        }}
                        className={errors.pwd ? "border-red-500" : ""}
                      />
                      {errors.pwd && (
                        <p className="text-sm text-red-500">{errors.pwd}</p>
                      )}
                    </div>
                  )}
                  {passwordMode === "reset" && (
                    <Alert>
                      <AlertTitle>Password will be reset</AlertTitle>
                      <AlertDescription>
                        A new password will be generated and set for this account.
                        Any applications using the current password will need to be updated.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              )}
            </div>
          )}

          {mode === "create" && typeof config.createOption === "object" && (
            <div className="space-y-4">
              {config.createOption.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label || field.name}</Label>
                  <div className="flex gap-2">
                    <Input
                      id={field.name}
                      type={field.type || "text"}
                      value={createFields[field.name] || field.default || ""}
                      onChange={(e) => handleCreateFieldChange(field.name, e.target.value)}
                      placeholder={field.default}
                      className={errors[field.name] ? "border-red-500" : ""}
                    />
                    {field.generator && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          const generated = generateFieldValue(field);
                          handleCreateFieldChange(field.name, generated);
                        }}
                      >
                        Generate
                      </Button>
                    )}
                  </div>
                  {errors[field.name] && (
                    <p className="text-sm text-red-500">{errors[field.name]}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Continue
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
