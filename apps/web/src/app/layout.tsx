import React from 'react';
import type { Metadata } from 'next';
import { Murecho, Outfit } from 'next/font/google';
import './globals.css';

const murecho = Murecho({ 
  subsets: ['latin'],
  variable: '--font-murecho',
  display: 'swap',
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hackanomics | Macro Economy Game',
  description: 'An educational investment simulation platform.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${murecho.variable} ${outfit.variable}`}>
      <body className="antialiased min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  );
}
