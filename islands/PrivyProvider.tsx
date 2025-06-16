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
    
    // Try to dynamically import Privy using the import map
    const loadPrivy = async () => {
      try {
        const module = await import("@privy-io/react-auth");
        setPrivyComponent(() => module.PrivyProvider);
        console.log("✅ Privy loaded successfully");
      } catch (error) {
        console.warn("⚠️ Privy not available, running in demo mode:", error);
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