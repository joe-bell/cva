import type { AppProps } from "next/app";
import { GoogleAnalytics } from "nextjs-google-analytics";
import "../styles/global.css";

export default function MyApp({ Component, pageProps }: AppProps) {
  return (
    <>
      <GoogleAnalytics trackPageViews gaMeasurementId="G-E8Z8HL9WXF" />
      <Component {...pageProps} />
    </>
  );
}
