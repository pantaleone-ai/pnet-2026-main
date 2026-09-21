#!/usr/bin/env python3
"""
R2 image uploader (env-gated, S3-compatible API).

Prefers Cloudflare R2 when R2_* env vars are present; otherwise returns None
so callers fall back to the local file path. R2 absence must never fail
content generation.

Environment (see .env.example):
    R2_ACCOUNT_ID        Cloudflare account ID
    R2_ACCESS_KEY_ID     S3-style access key (token ID)
    R2_SECRET_ACCESS_KEY S3-style secret (SHA-256 hex of token value)
    R2_BUCKET            e.g. pantaleone-net-images
    R2_PUBLIC_BASE       e.g. https://img.pantaleone.net

Usage:
    from r2_upload import upload_image
    url = upload_image("output.webp", key_prefix="blog-images")
"""

import mimetypes
import os
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parent.parent
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))
try:
    from dotenv import load_dotenv

    load_dotenv(PROJECT_ROOT / ".env")
except ImportError:
    pass

R2_ACCOUNT_ID = os.environ.get("R2_ACCOUNT_ID")
R2_ACCESS_KEY_ID = os.environ.get("R2_ACCESS_KEY_ID")
R2_SECRET_ACCESS_KEY = os.environ.get("R2_SECRET_ACCESS_KEY")
R2_BUCKET = os.environ.get("R2_BUCKET")
R2_PUBLIC_BASE = (os.environ.get("R2_PUBLIC_BASE") or "").rstrip("/")


def is_configured():
    """True only when every R2 env var is present."""
    return all(
        [
            R2_ACCOUNT_ID,
            R2_ACCESS_KEY_ID,
            R2_SECRET_ACCESS_KEY,
            R2_BUCKET,
            R2_PUBLIC_BASE,
        ]
    )


def upload_image(file_path, key_prefix="blog-images", key=None):
    """Upload an image to R2. Returns the public URL, or None when R2 is
    not configured (caller keeps the local path). Never raises."""

    if not is_configured():
        return None

    file_path = Path(file_path).expanduser()
    if not file_path.exists():
        print(f"R2 upload skipped, file not found: {file_path}")
        return None

    object_key = key or f"{key_prefix.strip('/')}/{file_path.name}"

    try:
        import boto3

        client = boto3.client(
            "s3",
            endpoint_url=f"https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com",
            aws_access_key_id=R2_ACCESS_KEY_ID,
            aws_secret_access_key=R2_SECRET_ACCESS_KEY,
            region_name="auto",
        )
        content_type, _ = mimetypes.guess_type(str(file_path))
        client.upload_file(
            str(file_path),
            R2_BUCKET,
            object_key,
            ExtraArgs={"ContentType": content_type or "application/octet-stream"},
        )
    except Exception as e:
        print(f"R2 upload failed (keeping local file): {e}")
        return None

    url = f"{R2_PUBLIC_BASE}/{object_key}"
    print(f"Uploaded to R2: {url}")
    return url


def main():
    import argparse

    parser = argparse.ArgumentParser(description="Upload an image to Cloudflare R2")
    parser.add_argument("file", help="Image file to upload")
    parser.add_argument("--prefix", default="blog-images", help="R2 key prefix")
    parser.add_argument("--key", default=None, help="Full object key override")
    args = parser.parse_args()

    url = upload_image(args.file, key_prefix=args.prefix, key=args.key)
    if url:
        print(url)
    else:
        print("R2 not configured or upload failed; local file retained.")
        sys.exit(1)


if __name__ == "__main__":
    main()
