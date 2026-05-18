import json
import boto3
import os

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Items')
s3 = boto3.client('s3')
BUCKET = os.environ.get('BUCKET_NAME', 'nycu-lost-and-found-items-images')

def get_cors_headers():
    return {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type,Authorization"}

def lambda_handler(event, context):
    try:
        item_id = event['pathParameters']['id']
        claims = event['requestContext']['authorizer']['claims']
        caller_email = claims.get('email')
        groups = claims.get('cognito:groups', '')
        is_admin = 'Admins' in groups
        
        existing = table.get_item(Key={'id': item_id}).get('Item')
        if not existing: return {"statusCode": 404, "headers": get_cors_headers(), "body": json.dumps({"error": "Not found"})}
        
        if existing['authorEmail'] != caller_email and not is_admin:
            return {"statusCode": 403, "headers": get_cors_headers(), "body": json.dumps({"error": "Forbidden"})}
            
        if existing.get('imageKey'):
            try:
                s3.delete_object(Bucket=BUCKET, Key=existing['imageKey'])
            except:
                pass
                
        table.delete_item(Key={'id': item_id})
        return {"statusCode": 200, "headers": get_cors_headers(), "body": json.dumps({"message": "Deleted"})}
    except Exception as e:
        return {"statusCode": 500, "headers": get_cors_headers(), "body": json.dumps({"error": str(e)})}
