declare module 'react-code-blocks' {
  import { ComponentType, ReactNode } from 'react';

  export interface CopyBlockProps {
    text: string;
    language: string;
    showLineNumbers?: boolean;
    theme?: any;
    codeBlock?: boolean;
    onCopy?: () => void;
  }

  export const CopyBlock: ComponentType<CopyBlockProps>;
  export const dracula: any;
  export const github: any;
  // Add other exports as needed, or use a general export for themes
  export const CodeBlock: ComponentType<any>;
  export const Code: ComponentType<any>;
}
