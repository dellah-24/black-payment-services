export {};

declare global {
  interface Window {
    ethereum?: {
      isMetaMask?: boolean;
      request: (args: { method: string; params?: any[] }) => Promise<any>;
      on: (event: string, handler: (...args: any[]) => void) => void;
      removeListener: (event: string, handler: (...args: any[]) => void) => void;
      isConnected: () => boolean;
      networkVersion?: string;
      chainId?: string;
      selectedAddress?: string;
    };
  }
}

// Minimal react-native module declaration for type checking
// This must be at the top level, not inside declare global
declare module 'react-native' {
  export const View: React.ComponentType<any>;
  export const Text: React.ComponentType<any>;
  export const TextInput: React.ComponentType<any>;
  export const TouchableOpacity: React.ComponentType<any>;
  export const StyleSheet: {
    create: (styles: Record<string, any>) => Record<string, any>;
  };
  export const ScrollView: React.ComponentType<any>;
  export const Alert: {
    alert: (title: string, message?: string, buttons?: any[], options?: any) => void;
  };
  export const ActivityIndicator: React.ComponentType<any>;
  export const Linking: {
    openURL: (url: string) => Promise<void>;
  };
  export const useState: <T>(initial: T) => [T, (v: T) => void];
  export const useCallback: <T extends (...args: any[]) => any>(cb: T, deps: any[]) => T;
  export const useEffect: (cb: () => void | (() => void), deps: any[]) => void;
}

// qrcode module declaration
declare module 'qrcode' {
  interface QRCodeOptions {
    errorCorrectionLevel?: string;
    margin?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }
  
  interface QRCodeToStringOptions extends QRCodeOptions {
    format?: string;
  }
  
  const QRCode: {
    toDataURL: (content: string, options?: QRCodeOptions) => Promise<string>;
    toString: (content: string, options?: QRCodeToStringOptions) => Promise<string>;
  };
  
  export default QRCode;
}
