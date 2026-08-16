const escapeXml = (str) =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

function buildTrackLine(nowPlaying) {
  const suffix = ".mp3";
  const maxLen = 46;
  let base = nowPlaying || "nothing — probably mid-contest";
  const limit = maxLen - suffix.length;
  if (base.length > limit) {
    base = base.slice(0, limit - 1).trimEnd() + "…";
  }
  return escapeXml(base + suffix);
}

async function getAccessToken() {
  const auth = Buffer.from(
    `${process.env.SPOTIFY_CLIENT_ID}:${process.env.SPOTIFY_CLIENT_SECRET}`
  ).toString("base64");

  const resp = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: process.env.SPOTIFY_REFRESH_TOKEN,
    }),
  });
  if (!resp.ok) throw new Error("token refresh failed");
  const data = await resp.json();
  return data.access_token;
}

async function getNowPlaying(token) {
  const resp = await fetch(
    "https://api.spotify.com/v1/me/player/currently-playing",
    { headers: { Authorization: `Bearer ${token}` } }
  );
  if (resp.status === 204) return null;
  if (!resp.ok) throw new Error("now playing fetch failed");
  const data = await resp.json();
  if (!data || !data.is_playing || !data.item) return null;
  const track = data.item.name;
  const artist = data.item.artists[0].name;
  return `${track} — ${artist}`;
}

function renderSvg(nowPlaying) {
  const trackLine = buildTrackLine(nowPlaying);
  return `<svg viewBox="0 0 620 240" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="terminal session showing whoami, currently playing spotify track, and status">
  <title>vineet's terminal</title>
  <style>
    text { font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace; font-size: 15px; }
    .accent { fill: #2f9e44; }
    .fg { fill: #1a1a1a; }
    .dim { fill: #55595e; }
    .cur { fill: #1a1a1a; }

    .l1, .l2, .l3, .l4, .l5, .l6, .l7 { opacity: 0; }
    .l1 { animation: show .4s ease-out .1s forwards; }
    .l2 { animation: show .4s ease-out .8s forwards; }
    .l3 { animation: show .4s ease-out 1.6s forwards; }
    .l4 { animation: show .4s ease-out 2.3s forwards; }
    .l5 { animation: show .4s ease-out 3.1s forwards; }
    .l6 { animation: show .4s ease-out 3.8s forwards; }
    .l7 { animation: show .4s ease-out 4.6s forwards; }
    @keyframes show { to { opacity: 1; } }

    .blink { animation: blink 1s step-end infinite 5s; opacity: 0; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }

    @media (prefers-color-scheme: dark) {
      .accent { fill: #56d364; }
      .fg { fill: #e6e6e6; }
      .dim { fill: #9198a1; }
      .cur { fill: #e6e6e6; }
    }
  </style>

  <g class="l1">
    <text x="24" y="32"><tspan class="accent">$ </tspan><tspan class="fg">whoami</tspan></text>
  </g>
  <g class="l2">
    <text x="24" y="60" class="dim">vineet — backend dev, applied ml, competitive programmer</text>
  </g>

  <g class="l3">
    <text x="24" y="94"><tspan class="accent">$ </tspan><tspan class="fg">spotify --now-playing</tspan></text>
  </g>
  <g class="l4">
    <text x="24" y="122" class="dim">${trackLine}</text>
  </g>

  <g class="l5">
    <text x="24" y="156"><tspan class="accent">$ </tspan><tspan class="fg">cat status</tspan></text>
  </g>
  <g class="l6">
    <text x="24" y="184" class="dim">Sab badhiya ✌🏻</text>
  </g>

  <g class="l7">
    <text x="24" y="218"><tspan class="accent">$ </tspan></text>
  </g>
  <rect class="cur blink" x="42" y="202" width="9" height="20"/>
</svg>`;
}

module.exports = async (req, res) => {
  let svg;
  try {
    const token = await getAccessToken();
    const nowPlaying = await getNowPlaying(token);
    svg = renderSvg(nowPlaying);
  } catch (err) {
    svg = renderSvg(null);
  }

  res.setHeader("Content-Type", "image/svg+xml");
  res.setHeader(
    "Cache-Control",
    "public, max-age=60, s-maxage=60, stale-while-revalidate=30"
  );
  res.status(200).send(svg);
};
