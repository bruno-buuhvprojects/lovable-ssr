# getData

Pages that need data before render can attach a `getData` function to the route component. It runs:

- **On the server** when the request hits an SSR route (the result is serialized into `__PRELOADED_DATA__`).
- **On the client** when the user navigates to that route (e.g. via `useNavigate`) and the data for that route/params is not yet in the context.

Data is keyed by path + params, so revisiting the same URL reuses cached data.

## Parameters

`getData` receives a single argument **`params`** com esta forma:

```ts
{
  routeParams: Record<string, string>;   // from the path (e.g. :id → routeParams.id)
  searchParams: Record<string, string>;  // from the URL query string (?q=... → searchParams.q)
  request?: unknown;                     // optional request context (SSR only)
}
```

- **`routeParams`** — path segment values (e.g. route `/video/:id` with URL `/video/123` → `{ id: '123' }`).
- **`searchParams`** — query string parsed as key/value (e.g. `?sort=date&page=1` → `{ sort: 'date', page: '1' }`).
- **`request`** — contexto opcional da request preenchido pelo servidor SSR (cookies, headers, etc.). O framework **não** faz suposições sobre o conteúdo; a sua app decide o que ler (por exemplo, um cookie de JWT).

## Example

```tsx
// src/pages/VideoPage.tsx
interface VideoPageProps {
  video: Video;
  relatedVideos: Video[];
}

const VideoPage = ({ video, relatedVideos }: VideoPageProps) => {
  return (
    <div>
      <h1>{video.title}</h1>
      {/* ... */}
    </div>
  );
};

type GetDataParams = {
  routeParams: Record<string, string>;
  searchParams: Record<string, string>;
  request?: {
    cookies?: Record<string, string>;
    headers?: Record<string, string | string[] | undefined>;
    // any other fields your server decides to expose
  };
};

async function getData(params?: GetDataParams) {
  const id = params?.routeParams?.id;

  // Example: read an auth token from cookies on the server
  const authToken = params?.request?.cookies?.auth_token;

  const headers: Record<string, string> = {};
  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const [videoRes, relatedRes] = await Promise.all([
    fetch(`/api/videos/${id}`, { headers }).then((r) => r.json()),
    fetch(`/api/videos/${id}/related`, { headers }).then((r) => r.json()),
  ]);
  return {
    video: videoRes,
    relatedVideos: relatedRes.data,
  };
}

VideoPage.getData = getData;
export default VideoPage;
```

The route would be:

```ts
{ path: '/video/:id', Component: VideoPage, isSSR: true }
```

Then `params.routeParams` in `getData` will have `{ id: '...' }` from the path; `params.searchParams` will have the query string keys and values.

## Rules

- The return value of `getData` is passed as props to the page component.
- **`params.routeParams`** comes from the path (e.g. `:id` → `params.routeParams.id`). For the initial SSR request it's from the requested URL; on client navigation it's from the current location.
- **`params.searchParams`** comes from the URL query string (e.g. `?tab=info` → `params.searchParams.tab`).
- If `getData` throws on the server, the framework logs and sets `preloadedData.is_success = false`; you can handle that in the page if needed.
- Pages without `getData` render with no props from the framework (client-only or static).
