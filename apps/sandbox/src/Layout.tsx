import type { FC } from "hono/jsx";

const Layout: FC = (props) => {
  return (
    <html lang="en">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body>{props.children}</body>
    </html>
  );
};

export default Layout;
