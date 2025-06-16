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
    
    // Check if Privy is available from the global CDN script
    const checkPrivy = () => {
      if (typeof window !== 'undefined' && (window as any).Privy) {
        console.log("✅ Privy loaded from CDN");
        setPrivyComponent(() => (window as any).Privy.PrivyProvider);
      } else {
        console.log("⚠️ Privy not yet available, retrying...");
        // Retry after a short delay
        setTimeout(checkPrivy, 100);
      }
    };

    checkPrivy();
  }, []);

  // During SSR or while Privy is loading, render children without wrapper
  if (!isClient || !PrivyComponent) {
    return <div>{children}</div>;
  }

  // Once Privy is loaded, wrap with PrivyProvider
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