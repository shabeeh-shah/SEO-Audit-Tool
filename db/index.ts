type D1Statement = {
  bind: (...values: unknown[]) => { run: () => Promise<unknown>; first: <T>() => Promise<T | null> };
};

type D1Like = { prepare: (query: string) => D1Statement };

export function getD1(): D1Like {
  throw new Error('Saved share links are available in the live Signal app. This GitHub demo has no database configured.');
}
