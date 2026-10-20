"""Source URL checks: YouTube oEmbed, host allowlist, no private IPs."""

from __future__ import annotations

import ipaddress
import re
import socket
from urllib.parse import urlparse

import httpx

YOUTUBE_ID = re.compile(
    r"(?:youtube\.com/(?:watch\?v=|embed/|shorts/)|youtu\.be/)([A-Za-z0-9_-]{11})"
)
YOUTUBE_HOSTS = {"youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"}


def youtube_id(url: str | None) -> str | None:
    if not url:
        return None
    match = YOUTUBE_ID.search(url)
    return match.group(1) if match else None


def canonical_youtube(url: str) -> str | None:
    vid = youtube_id(url)
    return f"https://www.youtube.com/watch?v={vid}" if vid else None


def _host_ok(host: str) -> bool:
    host = host.lower().rstrip(".")
    if host in YOUTUBE_HOSTS:
        return True
    host = host.removeprefix("www.")
    parts = host.split(".")
    return len(parts) >= 2 and all(parts) and host not in {"localhost"}


def _public_host(host: str) -> bool:
    try:
        infos = socket.getaddrinfo(host, 443, type=socket.SOCK_STREAM)
    except OSError:
        return False
    for info in infos:
        ip = ipaddress.ip_address(info[4][0])
        if ip.is_private or ip.is_loopback or ip.is_link_local or ip.is_reserved or ip.is_multicast:
            return False
    return True


async def youtube_oembed_title(url: str) -> str | None:
    canonical = canonical_youtube(url)
    if not canonical:
        return None
    oembed = "https://www.youtube.com/oembed"
    try:
        async with httpx.AsyncClient(timeout=8.0) as client:
            resp = await client.get(oembed, params={"url": canonical, "format": "json"})
        if resp.status_code != 200:
            return None
        title = resp.json().get("title")
        return title if isinstance(title, str) and title.strip() else canonical
    except (httpx.HTTPError, ValueError):
        return None


async def search_youtube(query: str, api_key: str | None, limit: int = 3) -> list[dict[str, str]]:
    if not api_key or not query.strip():
        return []
    try:
        async with httpx.AsyncClient(timeout=12.0) as client:
            resp = await client.get(
                "https://www.googleapis.com/youtube/v3/search",
                params={
                    "part": "snippet",
                    "type": "video",
                    "maxResults": limit,
                    "q": query[:180],
                    "videoEmbeddable": "true",
                    "safeSearch": "strict",
                    "key": api_key,
                },
            )
        if resp.status_code != 200:
            return []
        hits: list[dict[str, str]] = []
        for item in resp.json().get("items", []):
            vid = (item.get("id") or {}).get("videoId")
            title = (item.get("snippet") or {}).get("title")
            if isinstance(vid, str) and isinstance(title, str):
                hits.append({"url": f"https://www.youtube.com/watch?v={vid}", "title": title})
        return hits
    except (httpx.HTTPError, ValueError):
        return []


def http_url_ok(url: str) -> bool:
    parsed = urlparse(url)
    if parsed.scheme != "https" or not parsed.hostname:
        return False
    if not _host_ok(parsed.hostname):
        return False
    return _public_host(parsed.hostname)
