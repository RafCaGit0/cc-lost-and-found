import json
import boto3
import os
from decimal import Decimal

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Items')
REGION = os.environ.get('AWS_REGION', 'ap-east-2')
s3 = boto3.client('s3', region_name=REGION, endpoint_url=f'https://s3.{REGION}.amazonaws.com')
BUCKET = os.environ.get('BUCKET_NAME', 'nycu-lost-and-found-items-images')

def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return int(obj) if obj % 1 == 0 else float(obj)
        return super(DecimalEncoder, self).default(obj)

def lambda_handler(event, context):
    try:
        item_id = event['pathParameters']['id']
        response = table.get_item(Key={'id': item_id})
        item = response.get('Item')
        if not item:
            return {"statusCode": 404, "headers": get_cors_headers(), "body": json.dumps({"error": "Not found"})}
            
        if item.get('imageKey'):
            item['imageUrl'] = s3.generate_presigned_url('get_object',
                Params={'Bucket': BUCKET, 'Key': item['imageKey']}, ExpiresIn=3600)
                
        return {"statusCode": 200, "headers": get_cors_headers(), "body": json.dumps(item, cls=DecimalEncoder)}
    except Exception as e:
        return {"statusCode": 500, "headers": get_cors_headers(), "body": json.dumps({"error": str(e)})}
