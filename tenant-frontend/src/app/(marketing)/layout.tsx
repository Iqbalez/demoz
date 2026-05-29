import { Instrument_Serif, Outfit } from "next/font/google";
import "../../styles/landing.css";

const instrument = Instrument_Serif({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-instrument",
  display: "swap",
  preload: true,
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-outfit",
  display: "swap",
  preload: true,
});

export default function MarketingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={`${instrument.variable} ${outfit.variable} marketing-root marketing-mesh min-h-screen`}>
      {children}
    </div>
  );
}
