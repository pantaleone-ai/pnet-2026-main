#!/usr/bin/env python3
"""
S3 Upload Script for MixPHD ComfyUI Workflows.
Uploads generated images to configured S3 bucket with folder routing.

Usage:
    python3 scripts/upload_to_s3.py <image_file> [service_folder]
    python3 scripts/upload_to_s3.py flux-klein_00001_.png mixphd

Environment Variables (see .env):
    AWS_ACCESS_KEY_ID
    AWS_SECRET_ACCESS_KEY
    AWS_REGION
    AWS_S3_BUCKET
    S3_FOLDER_MAP (format: key=value,key=value)
"""

import os
import sys
import json
import argparse
import boto3
from pathlib import Path
from dotenv import load_dotenv

# Load environment
PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
AWS_S3_BUCKET = os.environ.get("AWS_S3_BUCKET")
S3_FOLDER_MAP = os.environ.get("S3_FOLDER_MAP", "")

# Parse folder map
FOLDER_MAP = {}
if S3_FOLDER_MAP:
    for pair in S3_FOLDER_MAP.split(","):
        if "=" in pair:
            key, value = pair.strip().split("=", 1)
            FOLDER_MAP[key] = value


def get_s3_folder(service_key):
    """Get S3 folder path for a service key."""
    return FOLDER_MAP.get(service_key, "uploads")


def upload_to_s3(file_path, service_key="mixphd", custom_key=None):
    """Upload file to S3 with folder routing."""

    if not AWS_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID == "your-access-key":
        print("❌ AWS credentials not configured")
        return None

    file_path = Path(file_path).expanduser()
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return None

    # Determine S3 key
    s3_folder = get_s3_folder(service_key)
    filename = file_path.name

    if custom_key:
        s3_key = f"{s3_folder}/{custom_key}/{filename}"
    else:
        s3_key = f"{s3_folder}/{filename}"

    print(f"📤 Uploading: {file_path.name}")
    print(f"   → S3: {AWS_S3_BUCKET}/{s3_key}")

    try:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION,
        )

        s3_client.upload_file(
            str(file_path),
            AWS_S3_BUCKET,
            s3_key,
            ExtraArgs={
                "ContentType": "image/png",
                "ACL": "public-read" if service_key == "web" else "private",
            },
        )

        # Generate URL
        url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"

        print(f"✅ Uploaded successfully!")
        print(f"   URL: {url}")

        return {
            "url": url,
            "key": s3_key,
            "bucket": AWS_S3_BUCKET,
            "service": service_key,
        }

    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return None


def list_s3_folders():
    """List available S3 folder mappings."""
    print("📁 Configured S3 folders:")
    for key, folder in FOLDER_MAP.items():
        print(f"   {key} → {folder}")
    return FOLDER_MAP


def main():
    parser = argparse.ArgumentParser(description="Upload MixPHD images to S3")
    parser.add_argument("file", help="Image file to upload")
    parser.add_argument(
        "--service",
        "-s",
        default="mixphd",
        help=f"Service folder key (default: mixphd). Available: {list(FOLDER_MAP.keys())}",
    )
    parser.add_argument("--key", "-k", help="Custom S3 key suffix (optional)")
    parser.add_argument(
        "--list", "-l", action="store_true", help="List available S3 folders"
    )
    args = parser.parse_args()

    if args.list:
        list_s3_folders()
        return

    if not args.file:
        parser.print_help()
        return

    result = upload_to_s3(args.file, args.service, args.key)
    if result:
        print(f"\n🎉 Done! File available at:")
        print(f"   {result['url']}")


if __name__ == "__main__":
    main()
