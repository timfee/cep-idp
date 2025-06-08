import clsx from "clsx";
import type React from "react";
import { Text } from "./text";

const variants = {
  error: "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200",
  warning: "bg-amber-50 border-amber-200 text-amber-800 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200",
  info: "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200",
  success: "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200",
};

export function StaticAlert({
  variant = "info",
  className,
  children,
  ...props
}: {
  variant?: keyof typeof variants;
  className?: string;
  children: React.ReactNode;
} & React.ComponentPropsWithoutRef<"div">) {
  return (
    <div
      {...props}
      className={clsx(
        className,
        "rounded-lg border p-4",
        variants[variant]
      )}
    >
      {children}
    </div>
  );
}

export function StaticAlertTitle({
  className,
  ...props
}: React.ComponentPropsWithoutRef<"h3">) {
  return (
    <h3
      {...props}
      className={clsx(
        className,
        "text-base/6 font-semibold"
      )}
    />
  );
}

export function StaticAlertDescription({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof Text>) {
  return (
    <Text
      {...props}
      className={clsx(className, "mt-2")}
    />
  );
}
