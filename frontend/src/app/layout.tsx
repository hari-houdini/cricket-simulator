import * as stylex from "@stylexjs/stylex";
import type { Metadata } from "next";
import { Bodoni_Moda, DM_Sans } from "next/font/google";
import Link from "next/link";

import "./globals.css";
import { AppProviders } from "./AppProviders";
import { styles } from "./layout.styles";

const bodoniModa = Bodoni_Moda({
  variable: "--font-bodoni-moda",
  subsets: ["latin"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
});

/**
 * Document head metadata: the title and description used by the browser tab,
 * search results and link previews.
 */
export const metadata: Metadata = {
  title: "IPL Cricket Simulator",
  description:
    "A fantasy IPL season with friends: bid in a live auction, then play the league and playoffs.",
};

/**
 * Root layout. Applies the dark-only document styles, loads the two
 * design-system fonts (which become CSS variables that the font tokens read),
 * and renders the app shell: a skip link, the header and primary navigation,
 * and the `<main>` landmark that every page fills.
 *
 * @param props.children - The page rendered inside `<main>`.
 * @returns The `<html>` document shell.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
  // `stylex.props` returns its own `className`, so merge it with the font
  // variables instead of spreading over them, which would drop the fonts.
  const rootProps = stylex.props(styles.root);
  return (
    <html
      lang="en"
      {...rootProps}
      className={[
        rootProps.className,
        bodoniModa.variable,
        dmSans.variable,
      ].join(" ")}
    >
      <body {...stylex.props(styles.body)}>
        <AppProviders>
          <a href="#main" {...stylex.props(styles.skipLink)}>
            Skip to content
          </a>
          <header {...stylex.props(styles.header)}>
            <Link
              href="/"
              {...stylex.props(styles.brandLink, styles.focusRing)}
            >
              <span {...stylex.props(styles.brand)}>IPL Cricket Simulator</span>
            </Link>
            <nav aria-label="Primary">
              <ul {...stylex.props(styles.navList)}>
                <li>
                  <Link
                    href="/"
                    {...stylex.props(styles.navLink, styles.focusRing)}
                  >
                    Home
                  </Link>
                </li>
              </ul>
            </nav>
          </header>
          <main id="main" {...stylex.props(styles.main)}>
            {children}
          </main>
          <footer {...stylex.props(styles.footer)}>
            <p>
              A fantasy game. Not affiliated with the Indian Premier League.
            </p>
          </footer>
        </AppProviders>
      </body>
    </html>
  );
}
