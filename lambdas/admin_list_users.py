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
            
        # Fetch all admins to cross-reference
        try:
            admin_res = cognito.list_users_in_group(UserPoolId=USER_POOL_ID, GroupName='Admins')
            admin_usernames = {u['Username'] for u in admin_res.get('Users', [])}
        except cognito.exceptions.ResourceNotFoundException:
            # Group might not exist yet
            admin_usernames = set()

        res = cognito.list_users(UserPoolId=USER_POOL_ID)
        users = []
        for u in res.get('Users', []):
            attrs = {a['Name']: a['Value'] for a in u.get('Attributes', [])}
            users.append({
                'username': u['Username'],
                'email': attrs.get('email'),
                'status': u['UserStatus'],
                'isAdmin': u['Username'] in admin_usernames
            })
            
        return {"statusCode": 200, "headers": get_cors_headers(), "body": json.dumps(users)}
    except Exception as e:
        return {"statusCode": 500, "headers": get_cors_headers(), "body": json.dumps({"error": str(e)})}
