# WordPress MCP Server

An MCP (Model Context Protocol) server for managing WordPress sites through the
WordPress REST API (`/wp-json/wp/v2/`). Runs over stdio.

## Setup

```bash
cd mcp
npm install
```

Requires Node.js 18+ (uses the built-in global `fetch`). Tested on Node 22.

## Authentication

Every tool takes `site_url`, `username`, and `app_password`. Generate an
**Application Password** in WordPress under *Users → Profile → Application
Passwords*. Requests authenticate with HTTP Basic Auth over HTTPS.

## Configuration

`.claude/settings.json` registers the server with Claude Code:

```json
{
  "mcpServers": {
    "wordpress": {
      "command": "node",
      "args": ["mcp/wordpress-server.js"],
      "cwd": "."
    }
  }
}
```

## Tools

| Tool | Description |
| --- | --- |
| `wp_get_site_info` | Site name, description, URL, namespaces |
| `wp_list_posts` | List posts (`per_page`, `status`) |
| `wp_get_post` | Get one post by ID |
| `wp_create_post` | Create a post (`title`, `content`, `status`, `categories`) |
| `wp_update_post` | Update a post |
| `wp_delete_post` | Trash or permanently delete a post (`force`) |
| `wp_list_pages` | List pages |
| `wp_get_page` | Get one page by ID |
| `wp_create_page` | Create a page |
| `wp_update_page` | Update a page |
| `wp_list_media` | List media items (`per_page`) |
| `wp_list_categories` | List categories |
| `wp_list_tags` | List tags |

## Manual test

```bash
printf '%s\n' \
  '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{"protocolVersion":"2024-11-05","capabilities":{},"clientInfo":{"name":"test","version":"1.0"}}}' \
  '{"jsonrpc":"2.0","method":"notifications/initialized"}' \
  '{"jsonrpc":"2.0","id":2,"method":"tools/list","params":{}}' \
  | node mcp/wordpress-server.js
```
