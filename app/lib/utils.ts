import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Combine multiple class name values into a single string using `clsx`
 * and `tailwind-merge`.
 *
 * @param inputs - Values to merge into a single class name
 * @returns The merged class string
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

/**
 * Escape a string so it can be safely embedded into a regular expression.
 *
 * @param str - Raw string that may contain regex tokens
 * @returns The escaped string
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Type guard for checking if a given property exists on an object.
 *
 * @param obj - Object to examine
 * @param key - Property name to test for
 * @returns True when the key exists on the object
 */
export function hasOwnProperty<T extends object, K extends PropertyKey>(
  obj: T,
  key: K
): obj is T & Record<K, unknown> {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
