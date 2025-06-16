import { ComponentChildren } from "preact";
import { useEffect, useState } from "preact/hooks";

interface PrivyProviderProps {
  children: ComponentChildren;
}

export default function PrivyProvider({ children }: PrivyProviderProps) {
  const [isClient, setIsClient] = useState(false);
  const [PrivyComponent, setPrivyComponent] = useState<any>(null);

  useEffect(() => {
    setIsClient(true);
    
    // Dynamically import Privy to avoid SSR issues
    import("@privy-io/react-auth").then((module) => {
      setPrivyComponent(() => module.PrivyProvider);
    }).catch((error) => {
      console.error("Failed to load Privy:", error);
    });
  }, []);

  // During SSR or while loading, render children without Privy
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