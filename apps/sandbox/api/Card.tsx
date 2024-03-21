import { css } from "hono/css";
import type { FC } from "hono/jsx";

const cardLayout = css`
  padding: 1rem;
  border-radius: 0.5rem;
  border: 1px solid transparent;
  text-align: center;
  &:hover {
    border: 1px solid rgb(209 213 219);
    background-color: rgb(243 244 246);
    transition: all;
    transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  }
  @media (prefers-color-scheme: dark) {
    &:hover {
      background-color: rgba(38, 38, 38, 0.3);
      border: 1px solid rgb(38 38 38);
    }
  }
  @media screen and (min-width: 1024px) {
    text-align: left;
  }
`;

const labelClass = css`
  font-size: 24px;
  font-weight: 600;
  margin-bottom: 0.75rem;
  @media (prefers-color-scheme: dark) {
    color: white;
  }
`;

const valueClass = css`
  font-size: 14px;
  opacity: 0.5;
  @media (prefers-color-scheme: dark) {
    color: white;
  }
`;

export type Card = { label: string; value?: string | number };

const Card: FC<Card> = ({ label, value }: Card) => {
  return (
    <div class={cardLayout}>
      <div class={labelClass}>{label}</div>
      <div class={valueClass}>{value}</div>
    </div>
  );
};

export default Card;
