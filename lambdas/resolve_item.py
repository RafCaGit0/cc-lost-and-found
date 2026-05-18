import json
import boto3
import time

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Items')

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
            
        existing_status = existing.get('status')
        if existing_status == 'RESOLVED':
            return {"statusCode": 200, "headers": get_cors_headers(), "body": json.dumps({"message": "Already resolved"})}
            
        # TODO: Trigger SES Email here since we are transitioning to RESOLVED
        
        res = table.update_item(
            Key={'id': item_id},
            UpdateExpression="SET #st = :s, updatedAt = :u",
            ExpressionAttributeNames={'#st': 'status'},
            ExpressionAttributeValues={':s': 'RESOLVED', ':u': int(time.time() * 1000)},
            ReturnValues='ALL_NEW'
        )
        return {"statusCode": 200, "headers": get_cors_headers(), "body": json.dumps(res.get('Attributes', {}), default=str)}
    except Exception as e:
        return {"statusCode": 500, "headers": get_cors_headers(), "body": json.dumps({"error": str(e)})}
