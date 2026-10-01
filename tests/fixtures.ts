// Trimmed copies of the kind of HTML/JSON each platform returns to a link-preview fetcher.
// Shapes are based on what these sites serve publicly; contents are illustrative.

export const YOUTUBE_OEMBED = {
  title: "Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)",
  author_name: "Rick Astley",
  author_url: "https://www.youtube.com/@RickAstleyYT",
  type: "video",
  thumbnail_url: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
  provider_name: "YouTube",
};

export const YOUTUBE_PAGE = `<!DOCTYPE html><html><head>
<title>Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster) - YouTube</title>
<meta name="description" content="The official video for “Never Gonna Give You Up” by Rick Astley.">
<meta property="og:site_name" content="YouTube">
<meta property="og:title" content="Rick Astley - Never Gonna Give You Up (Official Video) (4K Remaster)">
<meta property="og:description" content="The official video for &ldquo;Never Gonna Give You Up&rdquo; by Rick Astley.">
<meta property="og:image" content="https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg">
<meta property="og:type" content="video.other">
</head><body>…</body></html>`;

export const INSTAGRAM_POST_PAGE = `<!DOCTYPE html><html><head>
<meta property="og:site_name" content="Instagram" />
<meta property="og:title" content="Studio Plantlife on Instagram: &quot;Our green living room makeover 🌿 #interiors #plants&quot;" />
<meta property="og:description" content="2,431 likes, 87 comments - studioplantlife on March 3, 2026: &quot;Our green living room makeover 🌿 #interiors #plants&quot;. " />
<meta property="og:image" content="https://scontent.cdninstagram.com/v/t51.29350-15/abc.jpg?stp=dst-jpg&amp;oh=xyz" />
<meta property="og:type" content="article" />
<meta property="og:url" content="https://www.instagram.com/p/CwzKkRJsC7C/" />
</head><body></body></html>`;

export const INSTAGRAM_LOGIN_PAGE = `<!DOCTYPE html><html><head>
<title>Instagram</title>
<meta property="og:site_name" content="Instagram" />
<meta property="og:title" content="Instagram" />
</head><body>Log in to see photos and videos from friends.</body></html>`;

export const PINTEREST_OEMBED = {
  type: "rich",
  title: "",
  author_name: "Cozy Home Ideas",
  author_url: "https://www.pinterest.com/cozyhomeideas/",
  thumbnail_url: "https://i.pinimg.com/236x/aa/bb/cc/aabbcc.jpg",
  provider_name: "Pinterest",
};

export const PINTEREST_PAGE = `<!DOCTYPE html><html><head>
<title>Scandinavian reading nook | Pinterest</title>
<meta property="og:title" content="Scandinavian reading nook">
<meta property="og:description" content="Soft light, a wool throw and a wall of books.">
<meta property="og:image" content="https://i.pinimg.com/originals/aa/bb/cc/aabbcc.jpg">
<meta property="og:type" content="pinterestapp:pin">
<meta property="og:site_name" content="Pinterest">
</head><body></body></html>`;

export const ARTICLE_PAGE = `<!DOCTYPE html><html lang="en"><head>
<meta charset="utf-8">
<title>Ignored when og:title exists</title>
<meta property="og:title" content="10 Small Kitchen Ideas That Actually Work">
<meta property="og:description" content="Clever storage &amp; layout tricks for tiny kitchens.">
<meta property="og:image" content="/images/kitchen-hero.jpg">
<meta property="og:type" content="article">
<meta property="og:site_name" content="Home &amp; Living">
<meta property="article:published_time" content="2026-05-14T09:00:00Z">
<link rel="canonical" href="https://homeandliving.example/articles/small-kitchens">
<script type="application/ld+json">
{"@context":"https://schema.org","@graph":[{"@type":"Article","headline":"10 Small Kitchen Ideas","author":[{"@type":"Person","name":"Maya Chen"}]}]}
</script>
</head><body><h1>10 Small Kitchen Ideas</h1></body></html>`;

export const TITLE_ONLY_PAGE =
  `<html><head><title>  Grandma&#39;s   Lemon Cake &#x2014; Recipe </title></head><body>…</body></html>`;
