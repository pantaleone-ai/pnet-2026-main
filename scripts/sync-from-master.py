#!/usr/bin/env python3
"""
Sync master configuration from Langfuse.

This script pulls all configuration from Langfuse:
- Agent definitions (prompts)
- MCP server configurations
- Encrypted secrets (with --secrets flag)

Usage:
    python3 scripts/sync-from-master.py              # Pull agents + MCP config
    python3 scripts/sync-from-master.py --secrets   # Pull + decrypt secrets
    python3 scripts/sync-from-master.py --all       # Pull everything
    python3 scripts/sync-from-master.py --push      # Push config TO Langfuse
"""

import json
import os
import sys
import base64
import argparse
import hashlib
from pathlib import Path
from datetime import datetime
from urllib.parse import urlencode

import requests
from requests.auth import HTTPBasicAuth

try:
    from cryptography.fernet import Fernet

    CRYPTO_AVAILABLE = True
except ImportError:
    CRYPTO_AVAILABLE = False
    print("Warning: cryptography not installed. Encrypted secrets won't work.")
    print("Install with: pip install cryptography")

PROJECT_ROOT = Path(__file__).resolve().parent.parent
CONFIG_FILE = PROJECT_ROOT / ".agentic-sync.json"
AGENTS_DIR = PROJECT_ROOT / ".opencode" / "agent"
ENV_FILE = PROJECT_ROOT / ".env"
MCP_FILE = PROJECT_ROOT / "mcp" / "cline_mcp_settings.json"


def load_config():
    if not CONFIG_FILE.exists():
        print(f"Error: Config file not found at {CONFIG_FILE}")
        sys.exit(1)
    with open(CONFIG_FILE) as f:
        return json.load(f)


def get_langfuse_client(config):
    host = config["langfuse"]["host"]
    public_key = os.environ.get("LANGFUSE_PUBLIC_KEY")
    secret_key = os.environ.get("LANGFUSE_SECRET_KEY")

    if not public_key or not secret_key:
        env_file = PROJECT_ROOT / ".env"
        if env_file.exists():
            with open(env_file) as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("LANGFUSE_PUBLIC_KEY="):
                        public_key = line.split("=", 1)[1]
                    elif line.startswith("LANGFUSE_SECRET_KEY="):
                        secret_key = line.split("=", 1)[1]

    if not public_key or not secret_key:
        print("Error: LANGFUSE_PUBLIC_KEY and LANGFUSE_SECRET_KEY must be set")
        sys.exit(1)

    return {
        "base_url": host.rstrip("/"),
        "auth": HTTPBasicAuth(public_key, secret_key),
        "public_key": public_key,
        "secret_key": secret_key,
    }


def fetch_all_prompts(client):
    prompts = {}
    page = 1
    while True:
        resp = requests.get(
            f"{client['base_url']}/api/public/v2/prompts",
            auth=client["auth"],
            params={"page": page, "limit": 50},
        )
        resp.raise_for_status()
        data = resp.json()
        for p in data.get("data", []):
            prompts[p["name"]] = p
        if page >= data.get("meta", {}).get("totalPages", 1):
            break
        page += 1
    return prompts


def fetch_prompt_content(client, prompt_name, label="latest"):
    resp = requests.get(
        f"{client['base_url']}/api/public/v2/prompts/{prompt_name}",
        auth=client["auth"],
        params={"type": "text", "label": label},
    )
    if resp.status_code == 404:
        return None
    resp.raise_for_status()
    return resp.json()


def parse_agent_frontmatter(content):
    """Parse agent markdown file frontmatter."""
    frontmatter = {}
    body = content

    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            fm_text = parts[1].strip()
            body = parts[2].strip()
            for line in fm_text.split("\n"):
                line = line.strip()
                if ":" in line and not line.startswith("#"):
                    key, _, value = line.partition(":")
                    frontmatter[key.strip()] = value.strip()

    return frontmatter, body


def build_agent_content(frontmatter, body):
    """Rebuild agent markdown from frontmatter and body."""
    fm_lines = ["---"]
    for key, value in frontmatter.items():
        fm_lines.append(f"{key}: {value}")
    fm_lines.append("---")
    fm_lines.append("")
    fm_lines.append(body)
    return "\n".join(fm_lines)


def cmd_pull_agents(config, client, dry_run=False):
    """Pull agent definitions from Langfuse."""
    prompts = fetch_all_prompts(client)
    prefix = config["langfuse"].get("promptPrefix", "agent-")

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Pulling agents from Langfuse...")

    pulled = 0
    for prompt_name, prompt_data in prompts.items():
        if not prompt_name.startswith(prefix):
            continue

        agent_name = prompt_name[len(prefix) :]
        filename = f"{agent_name}.md"
        filepath = AGENTS_DIR / filename

        full_prompt = fetch_prompt_content(client, prompt_name)
        if not full_prompt:
            continue

        body = full_prompt.get("prompt", "")
        config_data = full_prompt.get("config", {})

        frontmatter = {
            "description": config_data.get("description", ""),
            "model": config_data.get("model", ""),
            "temperature": config_data.get("temperature", ""),
        }

        content = build_agent_content(frontmatter, body)

        if not dry_run:
            filepath.parent.mkdir(parents=True, exist_ok=True)
            with open(filepath, "w") as f:
                f.write(content)

        print(f"  {'[DRY RUN] ' if dry_run else ''}{filename}")
        pulled += 1

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Pulled {pulled} agent(s)")


def cmd_push_agents(config, client, dry_run=False):
    """Push local agents to Langfuse."""
    agents_dir = config["agents"]["directory"]
    agent_path = PROJECT_ROOT / agents_dir

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Pushing agents to Langfuse...")

    files = list(agent_path.glob("*.md"))
    pushed = 0

    for filepath in files:
        with open(filepath) as f:
            content = f.read()

        frontmatter, body = parse_agent_frontmatter(content)
        agent_name = filepath.stem
        prompt_name = f"{config['langfuse'].get('promptPrefix', 'agent-')}{agent_name}"

        payload = {
            "name": prompt_name,
            "prompt": body,
            "type": "text",
            "config": frontmatter,
            "tags": config["langfuse"].get("tags", ["agentic"]),
        }

        if not dry_run:
            resp = requests.post(
                f"{client['base_url']}/api/public/v2/prompts",
                auth=client["auth"],
                json=payload,
            )
            if resp.status_code in (200, 201):
                print(f"  ✓ {filepath.name}")
                pushed += 1
            else:
                print(f"  ✗ {filepath.name}: {resp.status_code}")
        else:
            print(f"  [DRY RUN] {filepath.name} -> {prompt_name}")
            pushed += 1

    print(f"\n{'[DRY RUN] ' if dry_run else ''}Pushed {pushed} agent(s)")


def encrypt_env(encryption_key):
    """Encrypt .env file content."""
    if not CRYPTO_AVAILABLE:
        print("Error: cryptography not installed")
        sys.exit(1)

    if not ENV_FILE.exists():
        print(f"Error: {ENV_FILE} not found")
        sys.exit(1)

    with open(ENV_FILE, "rb") as f:
        data = f.read()

    fernet = Fernet(encryption_key.encode())
    encrypted = fernet.encrypt(data)

    return base64.b64encode(encrypted).decode()


def decrypt_env(encryption_key, encrypted_data):
    """Decrypt .env file content."""
    if not CRYPTO_AVAILABLE:
        print("Error: cryptography not installed")
        sys.exit(1)

    try:
        decoded = base64.b64decode(encrypted_data.encode())
        fernet = Fernet(encryption_key.encode())
        decrypted = fernet.decrypt(decoded)
        return decrypted.decode()
    except Exception as e:
        print(f"Error decrypting: {e}")
        sys.exit(1)


def cmd_push_secrets(config, client, dry_run=False):
    """Push encrypted secrets to Langfuse."""
    encryption_key = os.environ.get("ENCRYPTION_KEY")
    if not encryption_key:
        print("Error: ENCRYPTION_KEY not set in environment")
        sys.exit(1)

    encrypted = encrypt_env(encryption_key)

    payload = {
        "name": "master-secrets",
        "prompt": "DO NOT USE - Encrypted secrets blob",
        "type": "text",
        "config": {
            "encrypted_env": encrypted,
            "encrypted_at": datetime.now().isoformat(),
            "checksum": hashlib.sha256(encrypted.encode()).hexdigest()[:16],
        },
        "tags": ["master-config", "secrets"],
    }

    if not dry_run:
        resp = requests.post(
            f"{client['base_url']}/api/public/v2/prompts",
            auth=client["auth"],
            json=payload,
        )
        if resp.status_code in (200, 201):
            print("  ✓ Pushed encrypted secrets to Langfuse")
        else:
            print(f"  ✗ Failed: {resp.status_code}")
    else:
        print(f"  [DRY RUN] Would push encrypted secrets ({len(encrypted)} chars)")


def cmd_pull_secrets(config, client, dry_run=False):
    """Pull and decrypt secrets from Langfuse."""
    encryption_key = os.environ.get("ENCRYPTION_KEY")
    if not encryption_key:
        print("Error: ENCRYPTION_KEY not set in environment")
        print("This key MUST be set locally - never store in Langfuse!")
        sys.exit(1)

    prompt = fetch_prompt_content(client, "master-secrets")
    if not prompt:
        print("Error: master-secrets prompt not found in Langfuse")
        print("Run with --push-secrets first to upload")
        sys.exit(1)

    config_data = prompt.get("config", {})
    encrypted = config_data.get("encrypted_env", "")

    if not encrypted:
        print("Error: No encrypted data found")
        sys.exit(1)

    decrypted = decrypt_env(encryption_key, encrypted)

    if not dry_run:
        with open(ENV_FILE, "w") as f:
            f.write(decrypted)
        print(f"  ✓ Wrote decrypted secrets to {ENV_FILE}")
    else:
        print(f"  [DRY RUN] Would write {len(decrypted)} chars to {ENV_FILE}")


def cmd_push_mcp(config, client, dry_run=False):
    """Push MCP configuration to Langfuse."""
    if not MCP_FILE.exists():
        print(f"Error: {MCP_FILE} not found")
        sys.exit(1)

    with open(MCP_FILE) as f:
        mcp_config = json.load(f)

    payload = {
        "name": "master-mcp-config",
        "prompt": "MCP Server Configuration",
        "type": "text",
        "config": {
            "mcp_servers": mcp_config.get("mcpServers", {}),
            "updated_at": datetime.now().isoformat(),
        },
        "tags": ["master-config", "mcp"],
    }

    if not dry_run:
        resp = requests.post(
            f"{client['base_url']}/api/public/v2/prompts",
            auth=client["auth"],
            json=payload,
        )
        if resp.status_code in (200, 201):
            print("  ✓ Pushed MCP config to Langfuse")
        else:
            print(f"  ✗ Failed: {resp.status_code}")
    else:
        print(f"  [DRY RUN] Would push MCP config")


def cmd_pull_mcp(config, client, dry_run=False):
    """Pull MCP configuration from Langfuse."""
    prompt = fetch_prompt_content(client, "master-mcp-config")
    if not prompt:
        print("Error: master-mcp-config not found in Langfuse")
        print("Run with --push-mcp first to upload")
        sys.exit(1)

    mcp_config = prompt.get("config", {}).get("mcp_servers", {})

    full_config = {"mcpServers": mcp_config}

    if not dry_run:
        MCP_FILE.parent.mkdir(parents=True, exist_ok=True)
        with open(MCP_FILE, "w") as f:
            json.dump(full_config, f, indent=2)
        print(f"  ✓ Wrote MCP config to {MCP_FILE}")
    else:
        print(f"  [DRY RUN] Would write MCP config ({len(mcp_config)} servers)")


def main():
    parser = argparse.ArgumentParser(description="Sync master config from Langfuse")
    parser.add_argument(
        "--dry-run", action="store_true", help="Preview without making changes"
    )
    parser.add_argument(
        "--all", action="store_true", help="Pull everything (agents + MCP + secrets)"
    )
    parser.add_argument("--agents", action="store_true", help="Pull/push agents")
    parser.add_argument(
        "--secrets", action="store_true", help="Pull/push encrypted secrets"
    )
    parser.add_argument("--mcp", action="store_true", help="Pull/push MCP config")
    parser.add_argument(
        "--push", action="store_true", help="Push to Langfuse (default is pull)"
    )
    parser.add_argument(
        "--push-secrets", action="store_true", help="Push secrets to Langfuse"
    )
    parser.add_argument(
        "--push-mcp", action="store_true", help="Push MCP config to Langfuse"
    )

    args = parser.parse_args()

    config = load_config()
    client = get_langfuse_client(config)

    # Default: pull agents
    if args.all:
        cmd_pull_agents(config, client, dry_run=args.dry_run)
        cmd_pull_mcp(config, client, dry_run=args.dry_run)
        cmd_pull_secrets(config, client, dry_run=args.dry_run)
    elif args.push:
        cmd_push_agents(config, client, dry_run=args.dry_run)
    elif args.push_secrets:
        cmd_push_secrets(config, client, dry_run=args.dry_run)
    elif args.push_mcp:
        cmd_push_mcp(config, client, dry_run=args.dry_run)
    elif args.agents:
        if args.push:
            cmd_push_agents(config, client, dry_run=args.dry_run)
        else:
            cmd_pull_agents(config, client, dry_run=args.dry_run)
    elif args.secrets:
        if args.push:
            cmd_push_secrets(config, client, dry_run=args.dry_run)
        else:
            cmd_pull_secrets(config, client, dry_run=args.dry_run)
    elif args.mcp:
        if args.push:
            cmd_push_mcp(config, client, dry_run=args.dry_run)
        else:
            cmd_pull_mcp(config, client, dry_run=args.dry_run)
    else:
        # Default: pull agents
        cmd_pull_agents(config, client, dry_run=args.dry_run)


if __name__ == "__main__":
    main()
