import os
import sys
import time
import tempfile
from datetime import datetime

import boto3
from botocore.exceptions import ClientError, BotoCoreError
from dotenv import load_dotenv
from escpos import printer
import usb.core
import usb.util
import requests

from PIL import Image


# USB Printer Configuration
VENDOR_ID = 0x0483
PRODUCT_ID = 0x5720


def find_usb_endpoints(vendor_id: int, product_id: int) -> tuple[int, int]:
    """
    Dynamically find the IN and OUT endpoints for a USB device.

    Args:
        vendor_id: USB Vendor ID
        product_id: USB Product ID

    Returns:
        Tuple of (in_endpoint_address, out_endpoint_address)

    Raises:
        ValueError: If device not found or endpoints cannot be determined
    """
    # Find the USB device
    device = usb.core.find(idVendor=vendor_id, idProduct=product_id)

    if device is None:
        raise ValueError(
            f"USB device not found (Vendor: 0x{vendor_id:04x}, Product: 0x{product_id:04x})"
        )

    # Get the active configuration
    try:
        cfg = device.get_active_configuration()
    except usb.core.USBError:
        # If no active configuration, set the first one
        device.set_configuration()
        cfg = device.get_active_configuration()

    # Get the first interface (printers typically use interface 0)
    interface = cfg[(0, 0)]

    # Find the endpoints
    in_ep = None
    out_ep = None

    for endpoint in interface:
        ep_address = endpoint.bEndpointAddress

        # Check if it's an IN endpoint (bit 7 is set)
        if usb.util.endpoint_direction(ep_address) == usb.util.ENDPOINT_IN:
            in_ep = ep_address
        # Check if it's an OUT endpoint (bit 7 is clear)
        elif usb.util.endpoint_direction(ep_address) == usb.util.ENDPOINT_OUT:
            out_ep = ep_address

    if in_ep is None or out_ep is None:
        raise ValueError(f"Could not find endpoints. IN: {in_ep}, OUT: {out_ep}")

    print(f"USB Printer found:")
    print(f"  Vendor ID: 0x{vendor_id:04x}")
    print(f"  Product ID: 0x{product_id:04x}")
    print(f"  IN Endpoint: 0x{in_ep:02x}")
    print(f"  OUT Endpoint: 0x{out_ep:02x}\n")

    return in_ep, out_ep


# Find endpoints dynamically
try:
    in_endpoint, out_endpoint = find_usb_endpoints(VENDOR_ID, PRODUCT_ID)
    p = printer.Usb(
        idVendor=VENDOR_ID, idProduct=PRODUCT_ID, in_ep=in_endpoint, out_ep=out_endpoint
    )
except ValueError as e:
    print(f"Warning: {e}", file=sys.stderr)
    print(
        "Printer initialization will be skipped. Messages will only be displayed on screen.\n",
        file=sys.stderr,
    )
    p = None

def print_image_to_thermal(image_path: str) -> bool:
    """
    Print an image to the thermal printer.

    Args:
        image_path: Path to the image file

    Returns:
        True if successful, False otherwise
    """
    if p is None:
        print("Warning: Printer not available, skipping print", file=sys.stderr)
        return False

    try:
        print(f"Printing image ({image_path}) to thermal printer...")

        # Open the image and convert to a format suitable for thermal printing
        img = Image.open(image_path)

        # Convert to grayscale for better thermal printing
        img = img.convert("L")

        # Save the processed image temporarily
        processed_path = image_path.replace(".png", "_processed.png")
        img.save(processed_path)

        # Print the image
        p.image(processed_path)
        p.text("\n\n")  # Add some spacing after the image
        p.cut()  # Cut the paper

        print(f"✓ Image printed successfully")

        # Clean up processed image
        try:
            os.remove(processed_path)
        except:
            pass

        return True

    except Exception as e:
        print(f"Error printing image: {e}", file=sys.stderr)
        return False


def get_sqs_client():
    """Create and return an SQS client with AWS credentials."""
    return boto3.client(
        "sqs",
        region_name=os.getenv("AWS_REGION", "us-east-1"),
        aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
        aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
    )


def format_message(message: dict) -> str:
    """Format a message for display."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    message_id = message.get("MessageId", "Unknown")
    body_str = message.get("Body", "")
    return f"[{timestamp}] Message ID: {message_id} -> {body_str}"


def poll_queue(queue_url: str, wait_time: int = 20, max_messages: int = 1):
    """
    Continuously poll the SQS queue for new messages.

    Args:
        queue_url: The URL of the SQS queue
        wait_time: Long polling wait time in seconds (max 20)
        max_messages: Maximum number of messages to retrieve per poll (1-10)
    """
    sqs = get_sqs_client()

    print(f"Starting ticket listener...")
    print(f"Queue URL: {queue_url}")
    print(f"Polling with {wait_time}s wait time")
    print(f"Press Ctrl+C to stop\n")

    try:
        while True:
            try:
                # Receive messages from the queue (long polling)
                response = sqs.receive_message(
                    QueueUrl=queue_url,
                    MaxNumberOfMessages=max_messages,
                    WaitTimeSeconds=wait_time,
                    MessageAttributeNames=["All"],
                    AttributeNames=["All"],
                )

                messages = response.get("Messages", [])

                if messages:
                    for message in messages:
                        # Print the message
                        print(format_message(message))

                        # Render webpage and print to thermal printer
                        with tempfile.TemporaryDirectory() as tmpdir:
                            screenshot_path = os.path.join(
                                tmpdir, "ticket_screenshot.png"
                            )

                            # Download the ticket from R2
                            ticket_url = message.get("Body", "").strip()
                            response = requests.get(url=f"{os.getenv('TICKETS_BUCKET_URL')}/{ticket_url}")
                            with open(screenshot_path, "wb") as f:
                                f.write(response.content)

                            # Print to thermal printer
                            print_image_to_thermal(screenshot_path)

                        # Delete the message from the queue
                        receipt_handle = message["ReceiptHandle"]
                        sqs.delete_message(
                            QueueUrl=queue_url, ReceiptHandle=receipt_handle
                        )
                        print(f"✓ Message processed and deleted from queue\n")
                else:
                    # No messages received (timeout reached)
                    print(
                        f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] No new messages, continuing to poll..."
                    )

            except ClientError as e:
                error_code = e.response.get("Error", {}).get("Code", "Unknown")
                error_message = e.response.get("Error", {}).get(
                    "Message", "Unknown error"
                )
                print(f"AWS Error ({error_code}): {error_message}", file=sys.stderr)
                print("Retrying in 5 seconds...", file=sys.stderr)
                time.sleep(5)

            except BotoCoreError as e:
                print(f"Boto3 Error: {str(e)}", file=sys.stderr)
                print("Retrying in 5 seconds...", file=sys.stderr)
                time.sleep(5)

    except KeyboardInterrupt:
        print("\n\nShutting down ticket listener...")
        print("Goodbye!")
        sys.exit(0)


def main():
    # Load environment variables from .env file
    load_dotenv()

    # Get queue URL from environment variable
    queue_url = os.getenv("SQS_QUEUE_URL")

    if not queue_url:
        print("Error: SQS_QUEUE_URL environment variable is not set", file=sys.stderr)
        print(
            "\nPlease create a .env file with the following variables:", file=sys.stderr
        )
        print(
            "  SQS_QUEUE_URL=https://sqs.region.amazonaws.com/account-id/queue-name",
            file=sys.stderr,
        )
        print("  AWS_REGION=us-east-1", file=sys.stderr)
        print("  AWS_ACCESS_KEY_ID=your_access_key", file=sys.stderr)
        print("  AWS_SECRET_ACCESS_KEY=your_secret_key", file=sys.stderr)
        sys.exit(1)

    # Validate AWS credentials
    if not os.getenv("AWS_ACCESS_KEY_ID") or not os.getenv("AWS_SECRET_ACCESS_KEY"):
        print("Error: AWS credentials not found", file=sys.stderr)
        print(
            "Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file",
            file=sys.stderr,
        )
        sys.exit(1)

    # Start polling the queue
    poll_queue(queue_url)


if __name__ == "__main__":
    main()
