import './globals.css';

export const metadata = {
  title: 'TLKM Stock Insights & Data Warehouse Dashboard',
  description: 'Yahoo Finance-style visualisations, real-time analytics, automated ETL refreshes, and price predictions for Telkom Indonesia (TLKM) stock data.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
