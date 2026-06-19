#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

const server = new McpServer({
  name: "wordpress",
  version: "1.0.0",
});

// --- helpers ---
function auth(username, appPassword) {
  return "Basic " + Buffer.from(`${username}:${appPassword}`).toString("base64");
}

async function wpFetch(siteUrl, path, username, appPassword, method = "GET", body = null) {
  const base = siteUrl.replace(/\/$/, "");
  const url = `${base}/wp-json/wp/v2${path}`;
  const opts = {
    method,
    headers: {
      Authorization: auth(username, appPassword),
      "Content-Type": "application/json",
    },
  };
  if (body) opts.body = JSON.stringify(body);
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    const msg = data?.message || data?.code || text;
    throw new Error(`WordPress ${res.status}: ${msg}`);
  }
  return data;
}

// --- tools ---

server.tool(
  "wp_get_site_info",
  "Pobierz informacje o stronie WordPress (nazwa, opis, URL, wersja WP)",
  {
    site_url: z.string().describe("URL strony, np. https://example.com"),
    username: z.string().describe("Login administratora WP"),
    app_password: z.string().describe("Hasło aplikacji WP (Dashboard → Profil → Hasła aplikacji)"),
  },
  async ({ site_url, username, app_password }) => {
    const base = site_url.replace(/\/$/, "");
    const res = await fetch(`${base}/wp-json`, {
      headers: { Authorization: auth(username, app_password) },
    });
    const data = await res.json();
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          name: data.name,
          description: data.description,
          url: data.url,
          home: data.home,
          wp_version: data.namespaces,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "wp_list_posts",
  "Lista wpisów blogowych na stronie WordPress",
  {
    site_url: z.string(),
    username: z.string(),
    app_password: z.string(),
    per_page: z.number().optional().default(10).describe("Ile wpisów (max 100)"),
    status: z.string().optional().default("any").describe("Status: publish, draft, any"),
    search: z.string().optional().describe("Szukaj po tekście"),
  },
  async ({ site_url, username, app_password, per_page, status, search }) => {
    let path = `/posts?per_page=${per_page}&status=${status}`;
    if (search) path += `&search=${encodeURIComponent(search)}`;
    const posts = await wpFetch(site_url, path, username, app_password);
    const list = posts.map(p => ({
      id: p.id,
      title: p.title?.rendered,
      status: p.status,
      date: p.date,
      link: p.link,
      excerpt: p.excerpt?.rendered?.replace(/<[^>]+>/g, "").trim().slice(0, 100),
    }));
    return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
  }
);

server.tool(
  "wp_get_post",
  "Pobierz pełną treść jednego wpisu blogowego",
  {
    site_url: z.string(),
    username: z.string(),
    app_password: z.string(),
    post_id: z.number().describe("ID wpisu"),
  },
  async ({ site_url, username, app_password, post_id }) => {
    const p = await wpFetch(site_url, `/posts/${post_id}`, username, app_password);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id: p.id, title: p.title?.rendered,
          content: p.content?.rendered?.replace(/<[^>]+>/g, "").trim(),
          status: p.status, date: p.date, link: p.link,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "wp_create_post",
  "Utwórz nowy wpis blogowy na WordPress",
  {
    site_url: z.string(),
    username: z.string(),
    app_password: z.string(),
    title: z.string().describe("Tytuł wpisu"),
    content: z.string().describe("Treść wpisu (HTML lub tekst)"),
    status: z.string().optional().default("draft").describe("Status: draft, publish"),
    categories: z.array(z.number()).optional().describe("Lista ID kategorii"),
    tags: z.array(z.number()).optional().describe("Lista ID tagów"),
  },
  async ({ site_url, username, app_password, title, content, status, categories, tags }) => {
    const body = { title, content, status };
    if (categories) body.categories = categories;
    if (tags) body.tags = tags;
    const p = await wpFetch(site_url, "/posts", username, app_password, "POST", body);
    return {
      content: [{
        type: "text",
        text: `✅ Wpis utworzony!\nID: ${p.id}\nTytuł: ${p.title?.rendered}\nStatus: ${p.status}\nLink: ${p.link}`,
      }],
    };
  }
);

server.tool(
  "wp_update_post",
  "Zaktualizuj istniejący wpis blogowy",
  {
    site_url: z.string(),
    username: z.string(),
    app_password: z.string(),
    post_id: z.number(),
    title: z.string().optional(),
    content: z.string().optional(),
    status: z.string().optional(),
  },
  async ({ site_url, username, app_password, post_id, title, content, status }) => {
    const body = {};
    if (title !== undefined) body.title = title;
    if (content !== undefined) body.content = content;
    if (status !== undefined) body.status = status;
    const p = await wpFetch(site_url, `/posts/${post_id}`, username, app_password, "POST", body);
    return {
      content: [{
        type: "text",
        text: `✅ Wpis zaktualizowany!\nID: ${p.id}\nTytuł: ${p.title?.rendered}\nStatus: ${p.status}\nLink: ${p.link}`,
      }],
    };
  }
);

server.tool(
  "wp_delete_post",
  "Usuń wpis blogowy (domyślnie do kosza, force=true trwale)",
  {
    site_url: z.string(),
    username: z.string(),
    app_password: z.string(),
    post_id: z.number(),
    force: z.boolean().optional().default(false),
  },
  async ({ site_url, username, app_password, post_id, force }) => {
    await wpFetch(site_url, `/posts/${post_id}?force=${force}`, username, app_password, "DELETE");
    return { content: [{ type: "text", text: `✅ Wpis ${post_id} usunięty (force=${force})` }] };
  }
);

server.tool(
  "wp_list_pages",
  "Lista stron (pages) na WordPress",
  {
    site_url: z.string(),
    username: z.string(),
    app_password: z.string(),
    per_page: z.number().optional().default(20),
    status: z.string().optional().default("any"),
  },
  async ({ site_url, username, app_password, per_page, status }) => {
    const pages = await wpFetch(site_url, `/pages?per_page=${per_page}&status=${status}`, username, app_password);
    const list = pages.map(p => ({
      id: p.id, title: p.title?.rendered,
      status: p.status, slug: p.slug, link: p.link, parent: p.parent,
    }));
    return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
  }
);

server.tool(
  "wp_get_page",
  "Pobierz pełną treść jednej strony WordPress",
  {
    site_url: z.string(),
    username: z.string(),
    app_password: z.string(),
    page_id: z.number(),
  },
  async ({ site_url, username, app_password, page_id }) => {
    const p = await wpFetch(site_url, `/pages/${page_id}`, username, app_password);
    return {
      content: [{
        type: "text",
        text: JSON.stringify({
          id: p.id, title: p.title?.rendered, slug: p.slug,
          content: p.content?.rendered,
          status: p.status, link: p.link, parent: p.parent,
        }, null, 2),
      }],
    };
  }
);

server.tool(
  "wp_create_page",
  "Utwórz nową stronę (page) na WordPress",
  {
    site_url: z.string(),
    username: z.string(),
    app_password: z.string(),
    title: z.string(),
    content: z.string(),
    status: z.string().optional().default("draft"),
    parent: z.number().optional().describe("ID strony nadrzędnej"),
    slug: z.string().optional(),
  },
  async ({ site_url, username, app_password, title, content, status, parent, slug }) => {
    const body = { title, content, status };
    if (parent) body.parent = parent;
    if (slug) body.slug = slug;
    const p = await wpFetch(site_url, "/pages", username, app_password, "POST", body);
    return {
      content: [{
        type: "text",
        text: `✅ Strona utworzona!\nID: ${p.id}\nTytuł: ${p.title?.rendered}\nStatus: ${p.status}\nLink: ${p.link}`,
      }],
    };
  }
);

server.tool(
  "wp_update_page",
  "Zaktualizuj istniejącą stronę WordPress",
  {
    site_url: z.string(),
    username: z.string(),
    app_password: z.string(),
    page_id: z.number(),
    title: z.string().optional(),
    content: z.string().optional(),
    status: z.string().optional(),
  },
  async ({ site_url, username, app_password, page_id, title, content, status }) => {
    const body = {};
    if (title !== undefined) body.title = title;
    if (content !== undefined) body.content = content;
    if (status !== undefined) body.status = status;
    const p = await wpFetch(site_url, `/pages/${page_id}`, username, app_password, "POST", body);
    return {
      content: [{
        type: "text",
        text: `✅ Strona zaktualizowana!\nID: ${p.id}\nTytuł: ${p.title?.rendered}\nStatus: ${p.status}\nLink: ${p.link}`,
      }],
    };
  }
);

server.tool(
  "wp_list_categories",
  "Lista kategorii na WordPress",
  {
    site_url: z.string(),
    username: z.string(),
    app_password: z.string(),
  },
  async ({ site_url, username, app_password }) => {
    const cats = await wpFetch(site_url, "/categories?per_page=100", username, app_password);
    const list = cats.map(c => ({ id: c.id, name: c.name, slug: c.slug, count: c.count }));
    return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
  }
);

server.tool(
  "wp_list_tags",
  "Lista tagów na WordPress",
  {
    site_url: z.string(),
    username: z.string(),
    app_password: z.string(),
  },
  async ({ site_url, username, app_password }) => {
    const tags = await wpFetch(site_url, "/tags?per_page=100", username, app_password);
    const list = tags.map(t => ({ id: t.id, name: t.name, slug: t.slug, count: t.count }));
    return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
  }
);

server.tool(
  "wp_list_media",
  "Lista plików w bibliotece mediów WordPress",
  {
    site_url: z.string(),
    username: z.string(),
    app_password: z.string(),
    per_page: z.number().optional().default(20),
    media_type: z.string().optional().describe("Typ: image, video, audio, application"),
  },
  async ({ site_url, username, app_password, per_page, media_type }) => {
    let path = `/media?per_page=${per_page}`;
    if (media_type) path += `&media_type=${media_type}`;
    const media = await wpFetch(site_url, path, username, app_password);
    const list = media.map(m => ({
      id: m.id, title: m.title?.rendered, url: m.source_url,
      type: m.media_type, mime: m.mime_type, date: m.date,
    }));
    return { content: [{ type: "text", text: JSON.stringify(list, null, 2) }] };
  }
);

// --- start ---
const transport = new StdioServerTransport();
await server.connect(transport);
