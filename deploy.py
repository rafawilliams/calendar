#!/usr/bin/env python3
"""
Deploy calendar-app to EKS via CloudFormation.

Usage:
    export HOLIDAYAPI_KEY=your_key
    python deploy.py [--region us-east-1] [--stack-name calendar-app-stack] [--image-tag latest] [--skip-build]
"""

import argparse
import os
import subprocess
import sys
import time
from pathlib import Path

import boto3
from botocore.exceptions import ClientError
from dotenv import load_dotenv

load_dotenv()

TEMPLATE_PATH = Path(__file__).parent / "infra" / "cloudformation.yml"
K8S_DIR = Path(__file__).parent / "infra" / "k8s"


# ─────────────────────────────────────────────
# CloudFormation
# ─────────────────────────────────────────────

def deploy_stack(cf, stack_name: str, template_body: str) -> dict:
    """Create or update the CloudFormation stack and wait for completion."""
    try:
        cf.describe_stacks(StackName=stack_name)
        action = "update"
        print(f"[cloudformation] Updating stack '{stack_name}'...")
        try:
            cf.update_stack(
                StackName=stack_name,
                TemplateBody=template_body,
                Capabilities=["CAPABILITY_NAMED_IAM"],
            )
        except ClientError as e:
            if "No updates are to be performed" in str(e):
                print("[cloudformation] Stack is already up to date.")
                return get_stack_outputs(cf, stack_name)
            raise
    except ClientError as e:
        if "does not exist" in str(e):
            action = "create"
            print(f"[cloudformation] Creating stack '{stack_name}'...")
            cf.create_stack(
                StackName=stack_name,
                TemplateBody=template_body,
                Capabilities=["CAPABILITY_NAMED_IAM"],
            )
        else:
            raise

    waiter_name = "stack_create_complete" if action == "create" else "stack_update_complete"
    print(f"[cloudformation] Waiting for {action} to complete (this may take 15-20 min for EKS)...")
    waiter = cf.get_waiter(waiter_name)
    waiter.wait(
        StackName=stack_name,
        WaiterConfig={"Delay": 30, "MaxAttempts": 60},
    )
    print(f"[cloudformation] Stack {action} complete.")
    return get_stack_outputs(cf, stack_name)


def get_stack_outputs(cf, stack_name: str) -> dict:
    """Return stack outputs as a flat {key: value} dict."""
    response = cf.describe_stacks(StackName=stack_name)
    outputs = response["Stacks"][0].get("Outputs", [])
    return {o["OutputKey"]: o["OutputValue"] for o in outputs}


# ─────────────────────────────────────────────
# ECR / Docker
# ─────────────────────────────────────────────

def push_to_ecr(ecr_uri: str, region: str, tag: str) -> str:
    """Build Docker image, authenticate to ECR and push."""
    account_id = ecr_uri.split(".")[0]
    registry = f"{account_id}.dkr.ecr.{region}.amazonaws.com"
    full_tag = f"{ecr_uri}:{tag}"

    print(f"[docker] Building image → {full_tag}")
    _run(["docker", "build", "-t", full_tag, "."])

    print(f"[ecr] Authenticating to {registry}")
    login_password = _run(
        ["aws", "ecr", "get-login-password", "--region", region],
        capture=True,
    )
    _run(
        ["docker", "login", "--username", "AWS", "--password-stdin", registry],
        input_data=login_password,
    )

    print(f"[ecr] Pushing {full_tag}")
    _run(["docker", "push", full_tag])
    return tag


# ─────────────────────────────────────────────
# kubectl
# ─────────────────────────────────────────────

def update_kubeconfig(cluster_name: str, region: str):
    """Update local kubeconfig with EKS cluster credentials."""
    print(f"[kubectl] Updating kubeconfig for cluster '{cluster_name}'")
    _run(["aws", "eks", "update-kubeconfig", "--region", region, "--name", cluster_name])


def apply_manifests(k8s_dir: Path, ecr_uri: str, tag: str, api_key: str):
    """Substitute placeholders in manifests and apply them in order."""
    order = ["namespace.yml", "secret.yml", "deployment.yml", "service.yml"]

    for filename in order:
        src = k8s_dir / filename
        content = src.read_text()
        content = content.replace("__ECR_URI__", ecr_uri)
        content = content.replace("__IMAGE_TAG__", tag)
        content = content.replace("__HOLIDAYAPI_KEY__", api_key)

        print(f"[kubectl] Applying {filename}")
        proc = subprocess.run(
            ["kubectl", "apply", "-f", "-"],
            input=content.encode(),
            check=True,
        )

    print("[kubectl] All manifests applied.")
    print("[kubectl] Waiting for deployment rollout...")
    _run(["kubectl", "rollout", "status", "deployment/calendar-app", "-n", "calendar", "--timeout=120s"])


# ─────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────

def _run(cmd: list, capture: bool = False, input_data: str = None) -> str:
    """Run a shell command, raise on failure."""
    result = subprocess.run(
        cmd,
        capture_output=capture,
        input=input_data.encode() if input_data else None,
        check=True,
        text=not input_data,
    )
    if capture:
        return result.stdout.strip()
    return ""


# ─────────────────────────────────────────────
# Main
# ─────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Deploy calendar-app to EKS")
    parser.add_argument("--region", default="us-east-1")
    parser.add_argument("--stack-name", default="calendar-app-stack")
    parser.add_argument("--image-tag", default="latest")
    parser.add_argument("--skip-build", action="store_true", help="Skip docker build/push")
    args = parser.parse_args()

    api_key = os.environ.get("HOLIDAYAPI_KEY", "")
    if not api_key:
        print("ERROR: HOLIDAYAPI_KEY environment variable is required.", file=sys.stderr)
        sys.exit(1)

    cf = boto3.client("cloudformation", region_name=args.region)
    template_body = TEMPLATE_PATH.read_text()

    # 1. Infrastructure
    print("\n=== Step 1/4: CloudFormation stack ===")
    outputs = deploy_stack(cf, args.stack_name, template_body)
    cluster_name = outputs["ClusterName"]
    ecr_uri = outputs["ECRRepositoryURI"]
    print(f"    Cluster : {cluster_name}")
    print(f"    ECR URI : {ecr_uri}")

    # 2. Docker image
    if not args.skip_build:
        print("\n=== Step 2/4: Build & push Docker image ===")
        push_to_ecr(ecr_uri, args.region, args.image_tag)
    else:
        print("\n=== Step 2/4: Skipping build (--skip-build) ===")

    # 3. kubeconfig
    print("\n=== Step 3/4: Configure kubectl ===")
    update_kubeconfig(cluster_name, args.region)

    # 4. K8s manifests
    print("\n=== Step 4/4: Apply Kubernetes manifests ===")
    apply_manifests(K8S_DIR, ecr_uri, args.image_tag, api_key)

    print("\n✓ Deployment complete.")
    print("  Run: kubectl get svc -n calendar")
    print("  to find the LoadBalancer EXTERNAL-IP.\n")


if __name__ == "__main__":
    main()
