# Gnocchi MCP

This local stdio server exposes five recipe tools: `find_recipes`, `get_recipe`, `save_recipe`, `create_variation`, and `update_recipe`. `save_recipe` marks user-supplied recipes as manual by default and can mark generated ones as AI-created. It calls the existing Gnocchi API; it needs no separate database or container.

```sh
python3 -m venv gnocchi-mcp/.venv
gnocchi-mcp/.venv/bin/pip install -r gnocchi-mcp/requirements.txt
```

Add it to Claude Code for every project, changing the paths to your checkout:

```sh
claude mcp add --scope user gnocchi -e GNOCCHI_API_URL=http://192.168.1.7:9085/api \
  -- /absolute/path/to/gnocchi/gnocchi-mcp/.venv/bin/python /absolute/path/to/gnocchi/gnocchi-mcp/server.py
ln -s /absolute/path/to/gnocchi/.agents/skills/gnocchi-recipes ~/.claude/skills/gnocchi-recipes
```

Then describe or dictate a recipe in any Claude Code session (including Remote Control from a phone) and ask to save it to Gnocchi. On NixOS the venv's Python lives in the Nix store; pin it with `nix-store --add-root gnocchi-mcp/.venv/python-gcroot --indirect -r <store path>` so garbage collection doesn't break the server.

For Codex, use `codex mcp add`, or this `~/.codex/config.toml` entry:

```toml
[mcp_servers.gnocchi]
command = "/absolute/path/to/gnocchi/gnocchi-mcp/.venv/bin/python"
args = ["/absolute/path/to/gnocchi/gnocchi-mcp/server.py"]
env = { GNOCCHI_API_URL = "http://192.168.1.7:9085/api" }
```

For local development, set `GNOCCHI_API_URL=http://localhost:8001` instead. Restart Codex after adding the server; `codex mcp list` should include `gnocchi`. The server follows the API's network access rules; keep its URL on your trusted LAN or VPN. There is no MCP port to open.

The [Gnocchi recipes skill](../.agents/skills/gnocchi-recipes/SKILL.md) is available when Codex runs in this repository. To use it from any repository, copy that skill directory to `~/.agents/skills`.
