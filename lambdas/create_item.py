import json
import boto3
import time
import uuid

dynamodb = boto3.resource('dynamodb')
table = dynamodb.Table('Items')

def get_cors_headers():
    return {"Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "Content-Type,Authorization"}

def lambda_handler(event, context):
    try:
        claims = event['requestContext']['authorizer']['claims']
        author_email = claims.get('email')
        
        body = json.loads(event.get('body', '{}'))
        post_type = body.get('postType')
        status = body.get('status')
        location = body.get('location')
        title = body.get('title')
        description = body.get('description', '')
        image_key = body.get('imageKey')
        
        if post_type not in ['FOUND', 'LOST']: return {"statusCode": 400, "headers": get_cors_headers(), "body": json.dumps({"error": "Invalid postType"})}
        
        # LOST always starts as OPEN; FOUND can start at any active status but not RESOLVED
        valid_initial_statuses = {'FOUND': ['LEFT_AT_SCENE', 'WITH_FINDER', 'AT_OFFICE'], 'LOST': ['OPEN']}
        if status not in valid_initial_statuses.get(post_type, []): return {"statusCode": 400, "headers": get_cors_headers(), "body": json.dumps({"error": "Invalid status for new post"})}
        
        valid_locations = ['Library', 'Engineering Building 1', 'Engineering Building 3', 'Student Cafeteria', 'Student Activity Center', 'Admin Office (Lost & Found)', 'Gymnasium', 'Dormitory Area', 'Main Gate', 'Other']
        if location not in valid_locations: return {"statusCode": 400, "headers": get_cors_headers(), "body": json.dumps({"error": "Invalid location"})}
        
        if not title: return {"statusCode": 400, "headers": get_cors_headers(), "body": json.dumps({"error": "Title required"})}
        
        item_id = str(uuid.uuid4())
        timestamp = int(time.time() * 1000)
        
        item = {
            'id': item_id,
            'postType': post_type,
            'title': title,
            'description': description,
            'location': location,
            'status': status,
            'authorEmail': author_email,
            'timestamp': timestamp,
            'updatedAt': timestamp
        }
        if image_key: item['imageKey'] = image_key
        
        table.put_item(Item=item)
        return {"statusCode": 201, "headers": get_cors_headers(), "body": json.dumps(item)}
    except Exception as e:
        return {"statusCode": 500, "headers": get_cors_headers(), "body": json.dumps({"error": str(e)})}
