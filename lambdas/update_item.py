import json
import boto3
import time
from decimal import Decimal

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
            
        body = json.loads(event.get('body', '{}'))
        new_status = body.get('status')
        new_title = body.get('title')
        new_description = body.get('description')
        new_location = body.get('location')
        new_tags = body.get('tags')
        new_lat = body.get('lat')
        new_lng = body.get('lng')
        new_incident_date = body.get('incidentDate')
        new_incident_time_range = body.get('incidentTimeRange')
        
        update_exp = "SET updatedAt = :u"
        exp_vals = {':u': int(time.time() * 1000)}
        
        if new_status:
            valid_statuses = {'FOUND': ['LEFT_AT_SCENE', 'WITH_FINDER', 'AT_OFFICE', 'RESOLVED'], 'LOST': ['OPEN', 'RESOLVED']}
            if new_status not in valid_statuses.get(existing['postType'], []):
                return {"statusCode": 400, "headers": get_cors_headers(), "body": json.dumps({"error": "Invalid status"})}
            update_exp += ", #st = :s"
            exp_vals[':s'] = new_status
            
        if new_title:
            update_exp += ", title = :t"
            exp_vals[':t'] = new_title
        if new_description is not None:
            update_exp += ", description = :d"
            exp_vals[':d'] = new_description
        if new_location:
            valid_locations = ['Library', 'Engineering Building 1', 'Engineering Building 3', 'Student Cafeteria', 'Student Activity Center', 'Admin Office (Lost & Found)', 'Gymnasium', 'Dormitory Area', 'Main Gate', 'Other']
            if new_location not in valid_locations:
                return {"statusCode": 400, "headers": get_cors_headers(), "body": json.dumps({"error": "Invalid location"})}
            update_exp += ", #loc = :l"
            exp_vals[':l'] = new_location
            
        if new_tags is not None and isinstance(new_tags, list):
            update_exp += ", tags = :tags"
            exp_vals[':tags'] = new_tags
            
        if new_lat is not None:
            update_exp += ", lat = :lat"
            exp_vals[':lat'] = Decimal(str(new_lat))
            
        if new_lng is not None:
            update_exp += ", lng = :lng"
            exp_vals[':lng'] = Decimal(str(new_lng))
            
        if new_incident_date is not None:
            update_exp += ", incidentDate = :idate"
            exp_vals[':idate'] = new_incident_date
            
        if new_incident_time_range is not None:
            update_exp += ", incidentTimeRange = :itime"
            exp_vals[':itime'] = new_incident_time_range
            
        names = {}
        if new_status: names['#st'] = 'status'
        if new_location: names['#loc'] = 'location'
        
        args = {
            'Key': {'id': item_id},
            'UpdateExpression': update_exp,
            'ExpressionAttributeValues': exp_vals,
            'ReturnValues': 'ALL_NEW'
        }
        if names: args['ExpressionAttributeNames'] = names
        
        res = table.update_item(**args)
        return {"statusCode": 200, "headers": get_cors_headers(), "body": json.dumps(res.get('Attributes', {}), default=str)}
    except Exception as e:
        return {"statusCode": 500, "headers": get_cors_headers(), "body": json.dumps({"error": str(e)})}
