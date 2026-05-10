import type { Metadata } from 'next';
import { Outfit, Cormorant_Garamond } from "next/font/google";
import { cn } from "@/lib/utils";
import './globals.css';

const outfit = Outfit({ subsets: ['latin'], variable: '--font-sans' });
const cormorant = Cormorant_Garamond({ 
  subsets: ['latin'], 
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-serif' 
});

export const metadata: Metadata = {
  title: 'WonderTales | Magic AI Storybook',
  description: 'Create magical illustrated stories with voice narration for kids.',
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={cn("font-sans", outfit.variable, cormorant.variable)}>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
