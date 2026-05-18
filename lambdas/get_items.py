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
        # Scan with pagination
        response = table.scan()
        items = response.get('Items', [])
        while 'LastEvaluatedKey' in response:
            response = table.scan(ExclusiveStartKey=response['LastEvaluatedKey'])
            items.extend(response.get('Items', []))
        
        # Filter
        qp = event.get('queryStringParameters') or {}
        if qp.get('postType'):
            items = [i for i in items if i.get('postType') == qp.get('postType')]
        if qp.get('status'):
            items = [i for i in items if i.get('status') == qp.get('status')]
            
        # Sort
        items.sort(key=lambda x: x.get('timestamp', 0), reverse=True)
        
        for item in items:
            if item.get('imageKey'):
                try:
                    item['imageUrl'] = s3.generate_presigned_url('get_object',
                        Params={'Bucket': BUCKET, 'Key': item['imageKey']}, ExpiresIn=900)
                except:
                    pass
                    
        return {"statusCode": 200, "headers": get_cors_headers(), "body": json.dumps(items, cls=DecimalEncoder)}
    except Exception as e:
        return {"statusCode": 500, "headers": get_cors_headers(), "body": json.dumps({"error": str(e)})}
