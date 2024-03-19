import { Style, css } from "hono/css";
import type { FC } from "hono/jsx";

const globalClasses = css`
  font-family: "Inter", sans-serif;
  font-optical-sizing: auto;
  font-weight: 400;
  font-style: normal;
  font-variation-settings: "slnt" 0;
  background: linear-gradient(to bottom, transparent, rgb(255, 255, 255))
    rgb(214, 219, 220);
  margin: 0;
  @media (prefers-color-scheme: dark) {
    background: linear-gradient(to bottom, transparent, rgb(0, 0, 0))
      rgb(0, 0, 0);
  }
`;

const mainClass = css`
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1024;
  margin: 0 auto;
  flex-direction: column;
  padding: 6rem;
  height: 79vh;
`;

const Layout: FC = (props) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap"
          rel="stylesheet"
        />
        <Style />
      </head>
      <body class={globalClasses}>
        <main class={mainClass}>{props.children}</main>
      </body>
    </html>
  );
};

export default Layout;
