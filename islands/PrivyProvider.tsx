import { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

interface PrivyProviderProps {
  children: ComponentChildren;
}

// Build-time safe Privy provider
export default function PrivyProvider({ children }: PrivyProviderProps) {
  const [isClient, setIsClient] = useState(false);
  const [PrivyComponent, setPrivyComponent] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Try to dynamically import Privy - this will work when the dependency is available
    const loadPrivy = async () => {
      try {
        // This will only work if @privy-io/react-auth is available
        const module = await import("https://esm.sh/@privy-io/react-auth@1.88.4");
        setPrivyComponent(() => module.PrivyProvider);
      } catch (error) {
        console.warn("Privy not available, running in demo mode");
      }
    };

    if (typeof window !== 'undefined') {
      loadPrivy();
    }
  }, []);

  // Always render children, with or without Privy wrapper
  if (!isClient || !PrivyComponent) {
    return <div>{children}</div>;
  }

  // Once client-side and Privy is loaded, wrap with PrivyProvider
  return (
    <PrivyComponent
      appId="cmby3d322003gl80mydesuezt"
      config={{
        loginMethods: ['twitter'],
        appearance: {
          theme: 'dark',
          accentColor: '#1DA1F2',
          logo: undefined,
        },
        embeddedWallets: {
          createOnLogin: 'off',
        },
        mfa: {
          noPromptOnMfaRequired: false,
        },
      }}
    >
      {children}
    </PrivyComponent>
  );
} 