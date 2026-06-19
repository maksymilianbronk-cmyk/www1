#!/usr/bin/env node
// MCP server for managing WordPress sites through the WordPress REST API.
// Transport: stdio. Auth: Basic Auth with an Application Password.

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// --- WordPress REST helpers -------------------------------------------------

function authHeader(username, app_password) {
  return "Basic " + btoa(`${username}:${app_password}`);
}

// endpoint is the path after /wp-json/ (e.g. "wp/v2/posts"); "" hits the API root.
async function wpRequest(
  site_url,
  endpoint,
  { username, app_password, method = "GET", body, query } = {}
) {
  const base = String(site_url).replace(/\/+$/, "");
  let url = `${base}/wp-json/${endpoint}`;

  if (query) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) params.append(key, String(value));
    }
    const qs = params.toString();
    if (qs) url += `?${qs}`;
  }

  const headers = {
    Authorization: authHeader(username, app_password),
    Accept: "application/json",
  };
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const raw = await res.text();
  let data;
  try {
    data = raw ? JSON.parse(raw) : null;
  } catch {
    data = raw;
  }

  if (!res.ok) {
    const detail = typeof data === "string" ? data : JSON.stringify(data);
    throw new Error(`WordPress API ${res.status} ${res.statusText}: ${detail}`);
  }
  return data;
}

function ok(data) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function fail(error) {
  return {
    content: [{ type: "text", text: `Error: ${error.message}` }],
    isError: true,
  };
}

// Shared credential parameters used by every tool.
const credentials = {
  site_url: z.string().describe("WordPress site URL, e.g. https://example.com"),
  username: z.string().describe("WordPress username"),
  app_password: z.string().describe("WordPress Application Password"),
};

// --- Server -----------------------------------------------------------------

const server = new McpServer({
  name: "wordpress-mcp-server",
  version: "1.0.0",
});

function tool(name, description, extraSchema, run) {
  server.registerTool(
    name,
    { description, inputSchema: { ...credentials, ...extraSchema } },
    async (args) => {
      try {
        const { site_url, username, app_password, ...rest } = args;
        const auth = { username, app_password };
        return ok(await run({ site_url, auth, ...rest }));
      } catch (error) {
        return fail(error);
      }
    }
  );
}

// --- Site -------------------------------------------------------------------

tool("wp_get_site_info", "Get general information about the WordPress site (name, description, URL, namespaces).", {}, ({ site_url, auth }) =>
  wpRequest(site_url, "", { ...auth })
);

// --- Posts ------------------------------------------------------------------

tool(
  "wp_list_posts",
  "List posts on the site.",
  {
    per_page: z.number().int().min(1).max(100).optional().describe("Number of posts to return (default 10)"),
    status: z.string().optional().describe("Post status filter, e.g. publish, draft, future, pending, private"),
  },
  ({ site_url, auth, per_page, status }) =>
    wpRequest(site_url, "wp/v2/posts", { ...auth, query: { per_page, status } })
);

tool(
  "wp_get_post",
  "Get a single post by ID.",
  { post_id: z.number().int().describe("ID of the post") },
  ({ site_url, auth, post_id }) =>
    wpRequest(site_url, `wp/v2/posts/${post_id}`, { ...auth })
);

tool(
  "wp_create_post",
  "Create a new post.",
  {
    title: z.string().describe("Post title"),
    content: z.string().describe("Post content (HTML allowed)"),
    status: z.string().optional().describe("Post status (default draft), e.g. publish, draft, pending, private"),
    categories: z.array(z.number().int()).optional().describe("Array of category IDs"),
  },
  ({ site_url, auth, title, content, status, categories }) =>
    wpRequest(site_url, "wp/v2/posts", {
      ...auth,
      method: "POST",
      body: { title, content, status: status ?? "draft", ...(categories ? { categories } : {}) },
    })
);

tool(
  "wp_update_post",
  "Update an existing post.",
  {
    post_id: z.number().int().describe("ID of the post to update"),
    title: z.string().optional().describe("New title"),
    content: z.string().optional().describe("New content (HTML allowed)"),
    status: z.string().optional().describe("New status"),
  },
  ({ site_url, auth, post_id, title, content, status }) => {
    const body = {};
    if (title !== undefined) body.title = title;
    if (content !== undefined) body.content = content;
    if (status !== undefined) body.status = status;
    return wpRequest(site_url, `wp/v2/posts/${post_id}`, { ...auth, method: "POST", body });
  }
);

tool(
  "wp_delete_post",
  "Delete a post. By default moves it to trash; set force=true to delete permanently.",
  {
    post_id: z.number().int().describe("ID of the post to delete"),
    force: z.boolean().optional().describe("Permanently delete instead of trashing (default false)"),
  },
  ({ site_url, auth, post_id, force }) =>
    wpRequest(site_url, `wp/v2/posts/${post_id}`, {
      ...auth,
      method: "DELETE",
      query: { force: force ? "true" : undefined },
    })
);

// --- Pages ------------------------------------------------------------------

tool("wp_list_pages", "List pages on the site.", {}, ({ site_url, auth }) =>
  wpRequest(site_url, "wp/v2/pages", { ...auth })
);

tool(
  "wp_get_page",
  "Get a single page by ID.",
  { page_id: z.number().int().describe("ID of the page") },
  ({ site_url, auth, page_id }) =>
    wpRequest(site_url, `wp/v2/pages/${page_id}`, { ...auth })
);

tool(
  "wp_create_page",
  "Create a new page.",
  {
    title: z.string().describe("Page title"),
    content: z.string().describe("Page content (HTML allowed)"),
    status: z.string().optional().describe("Page status (default draft)"),
  },
  ({ site_url, auth, title, content, status }) =>
    wpRequest(site_url, "wp/v2/pages", {
      ...auth,
      method: "POST",
      body: { title, content, status: status ?? "draft" },
    })
);

tool(
  "wp_update_page",
  "Update an existing page.",
  {
    page_id: z.number().int().describe("ID of the page to update"),
    title: z.string().optional().describe("New title"),
    content: z.string().optional().describe("New content (HTML allowed)"),
    status: z.string().optional().describe("New status"),
  },
  ({ site_url, auth, page_id, title, content, status }) => {
    const body = {};
    if (title !== undefined) body.title = title;
    if (content !== undefined) body.content = content;
    if (status !== undefined) body.status = status;
    return wpRequest(site_url, `wp/v2/pages/${page_id}`, { ...auth, method: "POST", body });
  }
);

// --- Media, categories, tags ------------------------------------------------

tool(
  "wp_list_media",
  "List media library items.",
  { per_page: z.number().int().min(1).max(100).optional().describe("Number of items to return (default 10)") },
  ({ site_url, auth, per_page }) =>
    wpRequest(site_url, "wp/v2/media", { ...auth, query: { per_page } })
);

tool("wp_list_categories", "List post categories.", {}, ({ site_url, auth }) =>
  wpRequest(site_url, "wp/v2/categories", { ...auth })
);

tool("wp_list_tags", "List post tags.", {}, ({ site_url, auth }) =>
  wpRequest(site_url, "wp/v2/tags", { ...auth })
);

// --- Start ------------------------------------------------------------------

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Log to stderr so we don't corrupt the stdio JSON-RPC stream on stdout.
  console.error("WordPress MCP server running on stdio");
}

main().catch((error) => {
  console.error("Fatal error starting WordPress MCP server:", error);
  process.exit(1);
});
