import { Metadata } from 'next';
import {Geist, Geist_Mono} from 'next/font/google';
import './globals.css';
import './category-green.css';
import './clear-selection.css';
import { Work_Sans } from 'next/font/google';
import { ThemeProvider } from "./theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { cn } from '@/lib/utils';
import { Sidebar } from '@/components/ui/sidebar';
import { cookies } from 'next/headers';
import { migrateDatabase } from '@/lib/db-migrations';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

// Check if we're on the server side and run migrations
if (typeof window === 'undefined') {
  try {
    migrateDatabase();
    console.log('Database migrations completed during startup');
  } catch (error) {
    console.error('Error running database migrations:', error);
  }
}

export const metadata: Metadata = {
  title: 'TaskWise',
  description: 'To-Do List with AI Assistant',
};

/**
 * RootLayout component serves as the main layout for the application.
 * It wraps the children components and provides a consistent structure 
 * including theme management and a mode toggle button.
 *
 * @param {Object} props - The properties passed to the component.
 * @param {React.ReactNode} props.children - The child components to be rendered within the layout.
 * 
 * @returns {JSX.Element} The rendered layout component.
 */
export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/images/logo.png" type="image/png" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
