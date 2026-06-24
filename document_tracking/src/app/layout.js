import "./globals.css";
import { Providers } from "./Providers";
import NextTopLoader from "nextjs-toploader";

export const metadata = {
  title: "Document Tracking System – RUPP",
  description: "Royal University of Phnom Penh – Document Tracking System",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.bunny.net" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Battambang:wght@100;300;400;700;900&display=swap" rel="stylesheet" />
      </head>
      <body suppressHydrationWarning>
        <NextTopLoader
          color="#0c3f0d"
          initialPosition={0.08}
          crawlSpeed={200}
          height={3}
          crawl={true}
          showSpinner={false}
          easing="ease"
          speed={200}
          shadow="0 0 10px #0c3f0d,0 0 5px #0c3f0d"
        />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}