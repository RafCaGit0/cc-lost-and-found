import json
import boto3
import os

cognito = boto3.client('cognito-idp')
USER_POOL_ID = os.environ.get('USER_POOL_ID')

def get_cors_headers():
    return {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type,Authorization"}

def lambda_handler(event, context):
    try:
        claims = event['requestContext']['authorizer']['claims']
        groups = claims.get('cognito:groups', '')
        if 'Admins' not in groups:
            return {"statusCode": 403, "headers": get_cors_headers(), "body": json.dumps({"error": "Forbidden"})}
            
        body = json.loads(event.get('body', '{}'))
        username = body.get('username')
        if not username:
            return {"statusCode": 400, "headers": get_cors_headers(), "body": json.dumps({"error": "Username required"})}
            
        cognito.admin_add_user_to_group(
            UserPoolId=USER_POOL_ID,
            Username=username,
            GroupName='Admins'
        )
        return {"statusCode": 200, "headers": get_cors_headers(), "body": json.dumps({"message": "Promoted to Admin"})}
    except Exception as e:
        return {"statusCode": 500, "headers": get_cors_headers(), "body": json.dumps({"error": str(e)})}
