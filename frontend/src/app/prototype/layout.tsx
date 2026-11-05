import * as stylex from "@stylexjs/stylex";
import type { ReactNode } from "react";

import { prototypeTheme } from "../../shared/const/prototype-theme.stylex";
import { StadiumBackground } from "./_components/StadiumBackground";
import { styles } from "./layout.styles";

/**
 * The prototype's layout. It applies the pitch-at-night theme to everything
 * under `/prototype`, and it renders the animated background behind the steps.
 * The root layout still supplies the app's header, footer and skip link, so the
 * prototype only changes the content and the palette, not the navigation.
 *
 * The theme is a StyleX class on this wrapper, so the production routes keep the
 * navy and gold palette.
 *
 * @param props.children - The prototype step being shown.
 * @returns The themed column with the background behind it.
 */
export default function PrototypeLayout({
  children,
}: {
  readonly children: ReactNode;
}) {
  return (
    <div {...stylex.props(prototypeTheme, styles.root)}>
      <StadiumBackground />
      {children}
    </div>
  );
}
