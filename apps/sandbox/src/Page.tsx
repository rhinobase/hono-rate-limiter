// import type { RateLimitInfo } from "hono-rate-limiter";
import { css } from "hono/css";
import type { FC } from "hono/jsx";
import { Card } from "./Card";
import { Layout } from "./Layout";

const checkOut = css`
  font-family: monospace;
  padding: 1rem;
  border-radius: 0.75rem;
  border: 1px solid rgb(209 213 219);
  max-width: max-content;
  margin-right: auto;
  font-size: 0.875rem;
  background-color: rgb(229 231 235);
  @media (prefers-color-scheme: dark) {
    color: white;
    border: 1px solid rgb(38 38 38);
    background-color: rgba(39, 39, 42, 0.3);
  }
`;

const heading = css`
  text-align: center;
  line-height: 1;
  font-weight: 600;
  font-size: 1.31rem;
  @media (prefers-color-scheme: dark) {
    color: white;
  }

  @media screen and (min-width: 481px) and (max-width: 1023px) {
    font-size: 3rem;
  }

  @media screen and (min-width: 1024px) {
    font-size: 4.5rem;
  }
`;

const cardCss = css`
  display: grid;

  @media screen and (max-width: 480px) {
    grid-template-columns: repeat(1, 1fr);
  }

  @media screen and (min-width: 481px) and (max-width: 1023px) {
    grid-template-columns: repeat(2, 1fr);
  }

  @media screen and (min-width: 1024px) {
    grid-template-columns: repeat(4, 1fr);
  }
`;

const linkClass = css`
  text-decoration: none;
  color: black;
  font-weight: 600;
  @media (prefers-color-scheme: dark) {
    color: white;
  }
`;

export type Page = {
  info: { limit: number; used: number; remaining: number; resetTime: Date };
};

export const Page: FC<Page> = ({
  info: { limit, remaining, resetTime },
}: Page) => {
  const isSuccessful = remaining > 0;

  const cards = [
    {
      label: "Success",
      value: String(isSuccessful),
    },
    {
      label: "Limit",
      value: limit,
    },
    {
      label: "Remaining",
      value: remaining,
    },
    {
      label: "Reset",
      value: resetTime?.toUTCString(),
    },
  ];

  return (
    <Layout>
      <p class={checkOut}>
        Check out the source at{" "}
        <a
          class={linkClass}
          href="https://github.com/rhinobase/hono-rate-limiter"
        >
          github.com/rhinobase/hono-rate-limiter
        </a>
      </p>
      <h1 class={heading}>
        {isSuccessful ? (
          <>
            🔥hono-rate-limiter🔥 <br />+<br /> Vercel KV
          </>
        ) : (
          "You have reached the limit, please come back later"
        )}
      </h1>
      <div class={cardCss}>
        {cards.map((card) => (
          <Card {...card} />
        ))}
      </div>
    </Layout>
  );
};
