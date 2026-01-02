import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isActive(
  url: string,
  pathname: string,
  nested: boolean = true,
): boolean {
  if (url === pathname) return true;
  if (!nested) return false;

  return pathname.startsWith(url + "/");
}
