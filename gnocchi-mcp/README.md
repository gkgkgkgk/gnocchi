# Gnocchi MCP

This local stdio server exposes five recipe tools: `find_recipes`, `get_recipe`, `save_recipe`, `create_variation`, and `update_recipe`. `save_recipe` marks user-supplied recipes as manual by default and can mark generated ones as AI-created. It calls the existing Gnocchi API; it needs no separate database or container.

```sh
python3 -m venv gnocchi-mcp/.venv
gnocchi-mcp/.venv/bin/pip install -r gnocchi-mcp/requirements.txt
```

Add the server to Codex with `codex mcp add`, or use this `~/.codex/config.toml` entry, changing the paths to your checkout:

```toml
[mcp_servers.gnocchi]
command = "/absolute/path/to/gnocchi/gnocchi-mcp/.venv/bin/python"
args = ["/absolute/path/to/gnocchi/gnocchi-mcp/server.py"]
env = { GNOCCHI_API_URL = "http://192.168.1.7:9085/api" }
```

For local development, set `GNOCCHI_API_URL=http://localhost:8001` instead. Restart Codex after adding the server; `codex mcp list` should include `gnocchi`. The server follows the API's network access rules; keep its URL on your trusted LAN or VPN. There is no MCP port to open.

The [Gnocchi recipes skill](../.agents/skills/gnocchi-recipes/SKILL.md) is available when Codex runs in this repository. To use it from any repository, copy that skill directory to `~/.agents/skills`.
