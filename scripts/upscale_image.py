#!/usr/bin/env python3
"""
Upscale ComfyUI workflow via API.
Usage: python3 upscale_image.py <image_name> [scale]
       python3 upscale_image.py --help
"""

import json
import sys
import requests
import argparse

COMFYUI_HOST = "127.0.0.1"
COMFYUI_PORT = 8188


def load_workflow(path="workflows/upscale-workflow.json"):
    with open(path) as f:
        return json.load(f)


def inject_image(workflow, image_name):
    """Inject image filename into workflow."""
    if "5" in workflow and workflow["5"]["class_type"] == "LoadImage":
        workflow["5"]["inputs"]["image"] = image_name
    return workflow


def execute_workflow(workflow):
    """Send workflow to ComfyUI and queue for execution."""
    url = f"http://{COMFYUI_HOST}:{COMFYUI_PORT}/prompt"
    response = requests.post(url, json={"prompt": workflow}, timeout=60)
    if response.status_code != 200:
        print(f"Error: {response.status_code}")
        print(response.text)
        return None
    result = response.json()
    print(f"✓ Queued: {result.get('prompt_id', 'unknown')}")
    return result


def main():
    parser = argparse.ArgumentParser(description="Upscale image using ComfyUI")
    parser.add_argument("image", help="Image filename (in ~/ComfyUI/input/)")
    parser.add_argument("--output", "-o", default="upscaled", help="Output prefix")
    parser.add_argument(
        "--workflow",
        "-w",
        default="workflows/upscale-workflow.json",
        help="Workflow path",
    )
    args = parser.parse_args()

    print(f"🖼️  Upscaling: {args.image}")
    print(f"   Model: RealESRGAN_x4plus (4x)")

    workflow = load_workflow(args.workflow)
    workflow = inject_image(workflow, args.image)

    # Update output prefix
    if "6" in workflow and workflow["6"]["class_type"] == "SaveImage":
        workflow["6"]["inputs"]["filename_prefix"] = args.output

    result = execute_workflow(workflow)
    if result:
        print("⏳ Processing...")
        print(f"📁 Output: ~/ComfyUI/output/{args.output}_*.png")


if __name__ == "__main__":
    main()
