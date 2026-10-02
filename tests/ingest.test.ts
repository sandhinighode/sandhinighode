import { assertEquals, assertMatch, assertRejects } from "@std/assert";
import { ingestUrl } from "../supabase/functions/_shared/ingest/pipeline.ts";
import { InMemorySaveRepository } from "../supabase/functions/_shared/ingest/repository.ts";
import { IngestError } from "../supabase/functions/_shared/ingest/types.ts";
import {
  ARTICLE_PAGE,
  INSTAGRAM_LOGIN_PAGE,
  INSTAGRAM_POST_PAGE,
  PINTEREST_OEMBED,
  PINTEREST_PAGE,
  TITLE_ONLY_PAGE,
  YOUTUBE_OEMBED,
  YOUTUBE_PAGE,
} from "./fixtures.ts";
import { fakeFetcher, hang, html, jsonResponse, redirect } from "./helpers.ts";

const youtubeRoutes = {
  "https://www.youtube.com/oembed": jsonResponse(YOUTUBE_OEMBED),
  "https://www.youtube.com/watch": html(YOUTUBE_PAGE),
};

Deno.test("YouTube: watch link → video save with oEmbed details and page description", async () => {
  const repo = new InMemorySaveRepository();
  const { save, created } = await ingestUrl(
    { url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=tracker123&feature=share" },
    { repo, fetcher: fakeFetcher(youtubeRoutes) },
  );
  assertEquals(created, true);
  assertEquals(save.status, "ready");
  assertEquals(save.source, "youtube");
  assertEquals(save.content_type, "video");
  assertEquals(save.url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ&si=tracker123&feature=share");
  assertEquals(save.canonical_url, "https://www.youtube.com/watch?v=dQw4w9WgXcQ");
  assertEquals(save.title, "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)");
  assertEquals(save.author_name, "Rick Astley");
  assertEquals(save.description, "The official video for “Never Gonna Give You Up” by Rick Astley.");
  assertEquals(save.thumbnail_url, "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg");
  assertEquals(save.source_metadata, { video_id: "dQw4w9WgXcQ", is_short: false });
  assertEquals(save.processing_error, null);
});

Deno.test("YouTube: youtu.be share link is recognised as a duplicate of the watch link", async () => {
  const repo = new InMemorySaveRepository();
  const fetcher = fakeFetcher(youtubeRoutes);
  const first = await ingestUrl({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" }, { repo, fetcher });
  const second = await ingestUrl({ url: "https://youtu.be/dQw4w9WgXcQ?si=abc" }, { repo, fetcher });
  assertEquals(second.created, false);
  assertEquals(second.save.id, first.save.id);
  assertEquals(repo.saves.size, 1);
});

Deno.test("YouTube: private/deleted video (oEmbed 401, page has no details) → failed save with fallback", async () => {
  const repo = new InMemorySaveRepository();
  const { save } = await ingestUrl({ url: "https://www.youtube.com/shorts/aqz-KE-bpKQ" }, {
    repo,
    fetcher: fakeFetcher({
      "https://www.youtube.com/oembed": jsonResponse({ error: "Unauthorized" }, 401),
      "https://www.youtube.com/shorts/aqz-KE-bpKQ": html("<title>YouTube</title>"),
    }),
  });
  assertEquals(save.status, "failed");
  assertEquals(save.source, "youtube");
  assertEquals(save.canonical_url, "https://www.youtube.com/shorts/aqz-KE-bpKQ");
  assertMatch(save.processing_error!, /private or deleted/);
});

Deno.test("Instagram: public post → caption, author and image from preview tags", async () => {
  const repo = new InMemorySaveRepository();
  const { save } = await ingestUrl({
    url: "https://www.instagram.com/studioplantlife/p/CwzKkRJsC7C/?igsh=MWQ1ZGUxMzBkMA==",
  }, {
    repo,
    fetcher: fakeFetcher({ "https://www.instagram.com/p/CwzKkRJsC7C": html(INSTAGRAM_POST_PAGE) }),
  });
  assertEquals(save.status, "ready");
  assertEquals(save.source, "instagram");
  assertEquals(save.content_type, "post");
  assertEquals(save.canonical_url, "https://www.instagram.com/p/CwzKkRJsC7C");
  assertEquals(save.title, "Our green living room makeover 🌿 #interiors #plants");
  assertEquals(save.author_name, "Studio Plantlife");
  assertEquals(save.author_url, "https://www.instagram.com/studioplantlife/");
  assertEquals(save.thumbnail_url, "https://scontent.cdninstagram.com/v/t51.29350-15/abc.jpg?stp=dst-jpg&oh=xyz");
  assertEquals(save.source_metadata, { kind: "p", shortcode: "CwzKkRJsC7C", username: "studioplantlife" });
});

Deno.test("Instagram: login wall → link is still saved, marked failed with a friendly reason", async () => {
  const repo = new InMemorySaveRepository();
  const { save, created } = await ingestUrl({ url: "https://instagram.com/reel/C5Qp9ZsLm3T" }, {
    repo,
    fetcher: fakeFetcher({
      "https://www.instagram.com/reel/C5Qp9ZsLm3T": redirect(
        "https://www.instagram.com/accounts/login/?next=%2Freel%2FC5Qp9ZsLm3T%2F",
      ),
      "https://www.instagram.com/accounts/login/": html(INSTAGRAM_LOGIN_PAGE),
    }),
  });
  assertEquals(created, true);
  assertEquals(save.status, "failed");
  assertEquals(save.source, "instagram");
  assertEquals(save.canonical_url, "https://www.instagram.com/reel/C5Qp9ZsLm3T");
  assertMatch(save.processing_error!, /requires login/);
});

Deno.test("Pinterest: country-domain pin → canonical pin, oEmbed author + page title/description/image", async () => {
  const repo = new InMemorySaveRepository();
  const { save } = await ingestUrl({ url: "https://uk.pinterest.com/pin/99360735500167749/?utm_source=share" }, {
    repo,
    fetcher: fakeFetcher({
      "https://www.pinterest.com/oembed.json": jsonResponse(PINTEREST_OEMBED),
      "https://www.pinterest.com/pin/99360735500167749": html(PINTEREST_PAGE),
    }),
  });
  assertEquals(save.status, "ready");
  assertEquals(save.source, "pinterest");
  assertEquals(save.content_type, "image");
  assertEquals(save.canonical_url, "https://www.pinterest.com/pin/99360735500167749");
  assertEquals(save.title, "Scandinavian reading nook");
  assertEquals(save.description, "Soft light, a wool throw and a wall of books.");
  assertEquals(save.author_name, "Cozy Home Ideas");
  assertEquals(save.thumbnail_url, "https://i.pinimg.com/originals/aa/bb/cc/aabbcc.jpg");
  assertEquals(save.source_metadata, { pin_id: "99360735500167749" });
});

Deno.test("Web: article with Open Graph + JSON-LD → all fields, relative image made absolute", async () => {
  const repo = new InMemorySaveRepository();
  const { save } = await ingestUrl({ url: "homeandliving.example/articles/small-kitchens?utm_campaign=x#top" }, {
    repo,
    fetcher: fakeFetcher({ "https://homeandliving.example/articles/small-kitchens": html(ARTICLE_PAGE) }),
  });
  assertEquals(save.status, "ready");
  assertEquals(save.source, "web");
  assertEquals(save.content_type, "article");
  assertEquals(save.canonical_url, "https://homeandliving.example/articles/small-kitchens");
  assertEquals(save.title, "10 Small Kitchen Ideas That Actually Work");
  assertEquals(save.description, "Clever storage & layout tricks for tiny kitchens.");
  assertEquals(save.thumbnail_url, "https://homeandliving.example/images/kitchen-hero.jpg");
  assertEquals(save.author_name, "Maya Chen");
  assertEquals(save.site_name, "Home & Living");
  assertEquals(save.source_metadata.published_at, "2026-05-14T09:00:00Z");
});

Deno.test("Web: page with only a <title> → ready, entities decoded, whitespace tidied", async () => {
  const repo = new InMemorySaveRepository();
  const { save } = await ingestUrl({ url: "https://recipes.example/lemon-cake" }, {
    repo,
    fetcher: fakeFetcher({ "https://recipes.example/lemon-cake": html(TITLE_ONLY_PAGE) }),
  });
  assertEquals(save.status, "ready");
  assertEquals(save.title, "Grandma's Lemon Cake — Recipe");
  assertEquals(save.description, null);
  assertEquals(save.thumbnail_url, null);
  assertEquals(save.site_name, "recipes.example");
});

Deno.test("Web: direct image link → image save using the link as its thumbnail", async () => {
  const repo = new InMemorySaveRepository();
  const imageUrl = "https://cdn.example/photos/sunset%20beach.jpg";
  const { save } = await ingestUrl({ url: imageUrl }, {
    repo,
    fetcher: fakeFetcher({
      [imageUrl]: () => new Response(new Uint8Array([1, 2, 3]), { headers: { "content-type": "image/jpeg" } }),
    }),
  });
  assertEquals(save.status, "ready");
  assertEquals(save.content_type, "image");
  assertEquals(save.title, "sunset beach.jpg");
  assertEquals(save.thumbnail_url, imageUrl);
});

Deno.test("Web: 404 page → failed save that keeps the URL", async () => {
  const repo = new InMemorySaveRepository();
  const { save } = await ingestUrl({ url: "https://example.org/gone" }, {
    repo,
    fetcher: fakeFetcher({ "https://example.org/gone": html("<title>Not found</title>", 404) }),
  });
  assertEquals(save.status, "failed");
  assertEquals(save.url, "https://example.org/gone");
  assertMatch(save.processing_error!, /HTTP 404/);
});

Deno.test("Web: unreachable host → failed save", async () => {
  const repo = new InMemorySaveRepository();
  const { save } = await ingestUrl({ url: "https://no-such-host.example/page" }, { repo, fetcher: fakeFetcher({}) });
  assertEquals(save.status, "failed");
  assertMatch(save.processing_error!, /Couldn't reach no-such-host\.example/);
});

Deno.test({
  name: "Web: slow site → failed after the pipeline timeout, not stuck pending",
  sanitizeOps: false,
  sanitizeResources: false,
  async fn() {
    const repo = new InMemorySaveRepository();
    const { save } = await ingestUrl({ url: "https://slow.example/" }, {
      repo,
      fetcher: fakeFetcher({ "https://slow.example/": hang }),
      timeoutMs: 50,
    });
    assertEquals(save.status, "failed");
    assertMatch(save.processing_error!, /too long/);
  },
});

Deno.test("Retry: re-submitting a failed link fetches the details again", async () => {
  const repo = new InMemorySaveRepository();
  let up = false;
  const fetcher = fakeFetcher({
    "https://flaky.example/post": () => up ? html("<title>Back online</title>")() : html("oops", 503)(),
  });
  const first = await ingestUrl({ url: "https://flaky.example/post" }, { repo, fetcher });
  assertEquals(first.save.status, "failed");
  up = true;
  const second = await ingestUrl({ url: "https://flaky.example/post" }, { repo, fetcher });
  assertEquals(second.save.id, first.save.id);
  assertEquals(second.save.status, "ready");
  assertEquals(second.save.title, "Back online");
  assertEquals(second.save.processing_error, null);
});

Deno.test("Shared text from the source app is stored with the save", async () => {
  const repo = new InMemorySaveRepository();
  const { save } = await ingestUrl(
    { url: "https://recipes.example/lemon-cake", shared_text: "  Try this weekend!  " },
    {
      repo,
      fetcher: fakeFetcher({ "https://recipes.example/lemon-cake": html(TITLE_ONLY_PAGE) }),
    },
  );
  assertEquals(save.shared_text, "Try this weekend!");
});

Deno.test("Security: a public link that redirects to a private address is not followed", async () => {
  const repo = new InMemorySaveRepository();
  const fetcher = fakeFetcher({ "https://sneaky.example/": redirect("http://169.254.169.254/latest/meta-data/") });
  const { save } = await ingestUrl({ url: "https://sneaky.example/" }, { repo, fetcher });
  assertEquals(save.status, "failed");
  assertMatch(save.processing_error!, /private or local/);
  assertEquals(fetcher.calls, ["https://sneaky.example/"]);
});

for (
  const [input, pattern] of [
    ["", /provide a URL/],
    ["not a url", /not a valid URL/],
    ["ftp://files.example/x", /Only http and https/],
    ["javascript:alert(1)", /Only http and https/],
    ["http://localhost:3000/admin", /private or local/],
    ["http://192.168.1.1/", /private or local/],
    ["http://10.0.0.5/", /private or local/],
    ["http://[::1]/", /private or local/],
    ["http://[::ffff:127.0.0.1]/", /private or local/],
  ] as const
) {
  Deno.test(`Rejected input: ${JSON.stringify(input)}`, async () => {
    const repo = new InMemorySaveRepository();
    const err = await assertRejects(() => ingestUrl({ url: input }, { repo, fetcher: fakeFetcher({}) }), IngestError);
    assertMatch(err.message, pattern);
    assertEquals(repo.saves.size, 0);
  });
}
