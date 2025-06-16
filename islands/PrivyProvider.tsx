import { ComponentChildren } from "preact";

interface PrivyProviderProps {
  children: ComponentChildren;
}

export default function PrivyProvider({ children }: PrivyProviderProps) {
  // For now, just render children without Privy to avoid CORS issues
  // This allows the app to work while we figure out the authentication
  return <div>{children}</div>;
} 