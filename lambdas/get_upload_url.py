import json
import boto3
import os
import uuid
from botocore.config import Config

REGION = os.environ.get('AWS_REGION', 'ap-east-2')
s3 = boto3.client('s3', region_name=REGION, endpoint_url=f'https://s3.{REGION}.amazonaws.com')
BUCKET = os.environ.get('BUCKET_NAME', 'nycu-lost-and-found-items-images')

def get_cors_headers():
    return {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type,Authorization"}

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        content_type = body.get('contentType')
        
        allowed_types = ["image/jpeg", "image/png", "image/webp"]
        if content_type not in allowed_types:
            return {"statusCode": 400, "headers": get_cors_headers(), "body": json.dumps({"error": "Invalid image type"})}
            
        ext = content_type.split('/')[-1]
        image_key = f"uploads/{uuid.uuid4()}.{ext}"
        
        presigned_post = s3.generate_presigned_post(
            Bucket=BUCKET,
            Key=image_key,
            Fields={"Content-Type": content_type},
            Conditions=[
                {"Content-Type": content_type},
                ["content-length-range", 1, 10485760]
            ],
            ExpiresIn=300
        )
            
        return {"statusCode": 200, "headers": get_cors_headers(), "body": json.dumps({
            "uploadUrl": presigned_post['url'],
            "uploadFields": presigned_post['fields'],
            "imageKey": image_key
        })}
    except Exception as e:
        return {"statusCode": 500, "headers": get_cors_headers(), "body": json.dumps({"error": str(e)})}
