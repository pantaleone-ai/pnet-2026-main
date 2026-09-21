#!/usr/bin/env python3
"""
Full MixPHD Pipeline: Generate + Upscale + Upload to S3
Usage:
    python3 scripts/comfyui_full_pipeline.py "prompt" --service mixphd
"""

import json
import sys
import os
import time
import argparse
import boto3
import requests
from pathlib import Path
from dotenv import load_dotenv

PROJECT_ROOT = Path(__file__).resolve().parent.parent
load_dotenv(PROJECT_ROOT / ".env")

COMFYUI_HOST = "127.0.0.1"
COMFYUI_PORT = 8188

# S3 Config
AWS_ACCESS_KEY_ID = os.environ.get("AWS_ACCESS_KEY_ID")
AWS_SECRET_ACCESS_KEY = os.environ.get("AWS_SECRET_ACCESS_KEY")
AWS_REGION = os.environ.get("AWS_REGION", "us-east-1")
AWS_S3_BUCKET = os.environ.get("AWS_S3_BUCKET")
S3_FOLDER_MAP = os.environ.get(
    "S3_FOLDER_MAP", "mixphd=product-images,social=social-media,web=web-assets"
)

FOLDER_MAP = {}
if S3_FOLDER_MAP:
    for pair in S3_FOLDER_MAP.split(","):
        if "=" in pair:
            key, value = pair.strip().split("=", 1)
            FOLDER_MAP[key] = value


def load_workflow(path):
    with open(path) as f:
        return json.load(f)


def inject_prompt(workflow, prompt, branding=True):
    if branding:
        prompt = f"{prompt}, commercial beverage photography, high-end studio lighting, 8k macro, professional product shot, cinematic lighting, sharp details"

    node3 = workflow.get("3", {})
    class_type = node3.get("class_type")

    if class_type == "CLIPTextEncodeFlux":
        workflow["3"]["inputs"]["clip_l"] = prompt
        workflow["3"]["inputs"]["t5xxl"] = prompt
    elif class_type == "CLIPTextEncode":
        workflow["3"]["inputs"]["text"] = prompt

    return workflow


def inject_image(workflow, image_name):
    if "5" in workflow and workflow["5"]["class_type"] == "LoadImage":
        workflow["5"]["inputs"]["image"] = image_name
    return workflow


def execute_workflow(workflow, client_id="default"):
    url = f"http://{COMFYUI_HOST}:{COMFYUI_PORT}/prompt"
    response = requests.post(url, json={"prompt": workflow}, timeout=60)
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None
    result = response.json()
    return result


def wait_for_output(prefix, timeout=600):
    output_dir = os.path.expanduser("~/ComfyUI/output")
    start = time.time()

    while time.time() - start < timeout:
        files = [f for f in os.listdir(output_dir) if f.startswith(prefix)]
        if files:
            return files[0]
        time.sleep(5)

    return None


def upload_to_s3(file_path, service_key="mixphd"):
    """Upload file to R2 (preferred) with S3 legacy fallback."""
    try:
        from scripts.r2_upload import upload_image as upload_to_r2
    except ImportError:
        try:
            from r2_upload import upload_image as upload_to_r2
        except ImportError:
            upload_to_r2 = None
    if upload_to_r2:
        r2_url = upload_to_r2(file_path, key_prefix="generated")
        if r2_url:
            return r2_url
    if not AWS_ACCESS_KEY_ID or AWS_ACCESS_KEY_ID == "your-access-key":
        print("S3 not configured, skipping upload")
        return None

    file_path = Path(file_path).expanduser()
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return None

    s3_folder = FOLDER_MAP.get(service_key, "uploads")
    s3_key = f"{s3_folder}/{file_path.name}"

    print(f"📤 Uploading to S3: {s3_key}")

    try:
        s3_client = boto3.client(
            "s3",
            aws_access_key_id=AWS_ACCESS_KEY_ID,
            aws_secret_access_key=AWS_SECRET_ACCESS_KEY,
            region_name=AWS_REGION,
        )

        content_type = (
            "image/webp" if file_path.suffix.lower() == ".webp" else "image/png"
        )
        s3_client.upload_file(
            str(file_path),
            AWS_S3_BUCKET,
            s3_key,
            ExtraArgs={"ContentType": content_type, "ACL": "public-read"},
        )

        url = f"https://{AWS_S3_BUCKET}.s3.{AWS_REGION}.amazonaws.com/{s3_key}"
        print(f"✅ Uploaded: {url}")
        return url

    except Exception as e:
        print(f"❌ Upload failed: {e}")
        return None


def compress_with_imgsquash(file_path, quality=80):
    """Compress image using imgsquash API, returns path to compressed WebP file."""
    import imghdr

    url = "https://www.imgsquash.com/api/images/optimize"
    api_key = os.environ.get("IMGSQUASH_API_KEY")
    if not api_key:
        print("   IMGSQUASH_API_KEY not set, skipping compression")
        return None

    file_path = Path(file_path).expanduser()
    if not file_path.exists():
        print(f"❌ File not found: {file_path}")
        return None

    print(f"   📡 Sending to imgsquash...")

    try:
        with open(file_path, "rb") as f:
            files = {"image": (file_path.name, f, f"image/{file_path.suffix[1:]}")}
            data = {"format": "webp", "quality": quality}
            headers = {"x-api-key": api_key}

            response = requests.post(
                url, files=files, data=data, headers=headers, timeout=120
            )

        if response.status_code != 200:
            print(f"   ❌ imgsquash error: {response.status_code} - {response.text}")
            return None

        output_path = file_path.with_suffix(".webp")
        with open(output_path, "wb") as f:
            f.write(response.content)

        size_before = file_path.stat().st_size
        size_after = output_path.stat().st_size
        savings = (1 - size_after / size_before) * 100
        print(
            f"   ✅ Compressed: {size_before // 1024}KB → {size_after // 1024}KB ({savings:.1f}% smaller)"
        )

        return output_path

    except Exception as e:
        print(f"   ❌ Compression failed: {e}")
        return None


def main():
    parser = argparse.ArgumentParser(
        description="Full MixPHD pipeline: Generate + Upscale + S3"
    )
    parser.add_argument("prompt", help="Prompt for image generation")
    parser.add_argument(
        "--no-branding", action="store_true", help="Disable MixPHD branding"
    )
    parser.add_argument("--no-upscale", action="store_true", help="Skip upscaling")
    parser.add_argument(
        "--no-compress", action="store_true", help="Skip imgsquash compression"
    )
    parser.add_argument(
        "--quality",
        "-q",
        type=int,
        default=80,
        help="imgsquash compression quality (default: 80)",
    )
    parser.add_argument("--no-upload", action="store_true", help="Skip S3 upload")
    parser.add_argument(
        "--service",
        "-s",
        default="mixphd",
        help="S3 service folder (mixphd/social/web)",
    )
    parser.add_argument(
        "--scale", choices=["4x", "8x"], default="4x", help="Upscale factor"
    )
    args = parser.parse_args()

    print(f"🎨 Generating: {args.prompt}")
    print(f"   Branding: {not args.no_branding}")
    print(f"   Upscale: {args.scale if not args.no_upscale else 'none'}")
    print(
        f"   Compress: WebP quality={args.quality} (80 default)"
        if not args.no_compress
        else "   Compress: none"
    )
    print(f"   Upload: {args.service if not args.no_upload else 'none'}")
    print()

    # Step 1: Generate
    print("📷 Step 1: Generating image...")
    workflow = load_workflow("workflows/flux-standard-workflow.json")
    workflow = inject_prompt(workflow, args.prompt, not args.no_branding)
    result = execute_workflow(workflow)

    if not result:
        print("❌ Generation failed")
        return

    output_file = wait_for_output("flux-klein", timeout=600)
    if not output_file:
        print("❌ Generation timed out")
        return

    print(f"   ✅ Generated: {output_file}")

    output_path = Path(os.path.expanduser("~/ComfyUI/output")) / output_file

    # Step 2: Upscale
    if not args.no_upscale:
        print(f"\n🔍 Step 2: Upscaling ({args.scale})...")

        upscale_wf = load_workflow("workflows/upscale-workflow.json")
        if args.scale == "8x":
            upscale_wf["3"]["inputs"]["model_name"] = "8x_NMKD-Superscale_150000_G.pth"

        upscale_wf = inject_image(upscale_wf, output_file)
        upscale_wf["6"]["inputs"]["filename_prefix"] = (
            output_file.replace(".png", "") + "_upscaled"
        )

        result = execute_workflow(upscale_wf)
        if not result:
            print("❌ Upscale failed")
            return

        upscaled_file = wait_for_output(
            output_file.replace(".png", "") + "_upscaled", timeout=900
        )
        if not upscaled_file:
            print("❌ Upscale timed out")
            return

        print(f"   ✅ Upscaled: {upscaled_file}")
        output_path = Path(os.path.expanduser("~/ComfyUI/output")) / upscaled_file

    # Step 3: Compress with imgsquash (WebP)
    compressed_path = None
    if not args.no_compress:
        print(
            f"\n🗜️  Step 3: Compressing with imgsquash (WebP, quality={args.quality})..."
        )
        compressed_path = compress_with_imgsquash(output_path, args.quality)
        if compressed_path:
            print(f"   ✅ Compressed: {compressed_path}")
            output_path = compressed_path
        else:
            print("   ⚠️  Compression failed, using original")

    # Step 4: Upload to S3
    if not args.no_upload:
        print(f"\n☁️  Step 4: Uploading to S3 ({args.service})...")
        url = upload_to_s3(output_path, args.service)
        if url:
            print(f"\n🎉 Final URL: {url}")

    print(f"\n📁 Local Output: {output_path}")


if __name__ == "__main__":
    main()
