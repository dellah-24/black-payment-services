declare module 'qrcode' {
  interface QRCodeOptions {
    errorCorrectionLevel?: 'low' | 'medium' | 'quartile' | 'high' | 'L' | 'M' | 'Q' | 'H';
    type?: 'png' | 'svg' | 'utf8' | 'terminal';
    margin?: number;
    scale?: number;
    width?: number;
    color?: {
      dark?: string;
      light?: string;
    };
  }

  export function toDataURL(
    text: string,
    options?: QRCodeOptions
  ): Promise<string>;

  export function toString(
    text: string,
    options?: QRCodeOptions
  ): Promise<string>;
}