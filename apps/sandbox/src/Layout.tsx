import type { FC } from "hono/jsx";

const Layout: FC = (props) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <link href="/globals.css" rel="stylesheet" />
      </head>
      <body>{props.children}</body>
    </html>
  );
};

export default Layout;
