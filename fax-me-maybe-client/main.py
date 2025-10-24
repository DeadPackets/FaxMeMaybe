import os
import sys
import json
import time
from datetime import datetime

import boto3
from botocore.exceptions import ClientError, BotoCoreError
from dotenv import load_dotenv



def get_sqs_client():
    """Create and return an SQS client with AWS credentials."""
    return boto3.client(
        'sqs',
        region_name=os.getenv('AWS_REGION', 'us-east-1'),
        aws_access_key_id=os.getenv('AWS_ACCESS_KEY_ID'),
        aws_secret_access_key=os.getenv('AWS_SECRET_ACCESS_KEY'),
    )


def format_message(message: dict) -> str:
    """Format a message for display."""
    timestamp = datetime.now().strftime('%Y-%m-%d %H:%M:%S')
    message_id = message.get('MessageId', 'Unknown')

    try:
        # Try to parse the body as JSON for pretty printing
        body = json.loads(message.get('Body', '{}'))
        body_str = json.dumps(body, indent=2)
    except json.JSONDecodeError:
        # If not JSON, just use the raw body
        body_str = message.get('Body', '')

    return f"""
{'='*80}
[{timestamp}] New Ticket Message
Message ID: {message_id}
{'='*80}
{body_str}
{'='*80}
"""


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
                    MessageAttributeNames=['All'],
                    AttributeNames=['All']
                )

                messages = response.get('Messages', [])

                if messages:
                    for message in messages:
                        # Print the message
                        print(format_message(message))

                        # Delete the message from the queue
                        receipt_handle = message['ReceiptHandle']
                        sqs.delete_message(
                            QueueUrl=queue_url,
                            ReceiptHandle=receipt_handle
                        )
                        print(f"✓ Message processed and deleted from queue\n")
                else:
                    # No messages received (timeout reached)
                    print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] No new messages, continuing to poll...")

            except ClientError as e:
                error_code = e.response.get('Error', {}).get('Code', 'Unknown')
                error_message = e.response.get('Error', {}).get('Message', 'Unknown error')
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
    queue_url = os.getenv('SQS_QUEUE_URL')

    if not queue_url:
        print("Error: SQS_QUEUE_URL environment variable is not set", file=sys.stderr)
        print("\nPlease create a .env file with the following variables:", file=sys.stderr)
        print("  SQS_QUEUE_URL=https://sqs.region.amazonaws.com/account-id/queue-name", file=sys.stderr)
        print("  AWS_REGION=us-east-1", file=sys.stderr)
        print("  AWS_ACCESS_KEY_ID=your_access_key", file=sys.stderr)
        print("  AWS_SECRET_ACCESS_KEY=your_secret_key", file=sys.stderr)
        sys.exit(1)

    # Validate AWS credentials
    if not os.getenv('AWS_ACCESS_KEY_ID') or not os.getenv('AWS_SECRET_ACCESS_KEY'):
        print("Error: AWS credentials not found", file=sys.stderr)
        print("Please set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in your .env file", file=sys.stderr)
        sys.exit(1)

    # Start polling the queue
    poll_queue(queue_url)


if __name__ == "__main__":
    main()


