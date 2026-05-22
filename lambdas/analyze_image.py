import json
import boto3
import base64

# Explicitly using Tokyo region for Rekognition
rekognition = boto3.client('rekognition', region_name='ap-northeast-1')

def get_cors_headers():
    return {
        "Access-Control-Allow-Origin": "*", 
        "Access-Control-Allow-Headers": "Content-Type,Authorization"
    }

def lambda_handler(event, context):
    try:
        body = json.loads(event.get('body', '{}'))
        image_base64 = body.get('image')
        
        if not image_base64:
            return {"statusCode": 400, "headers": get_cors_headers(), "body": json.dumps({"error": "No image provided"})}
            
        # Strip the data:image/...;base64, prefix if present
        if ',' in image_base64:
            image_base64 = image_base64.split(',')[1]
            
        image_bytes = base64.b64decode(image_base64)
        
        # Call AWS Rekognition
        response = rekognition.detect_labels(
            Image={'Bytes': image_bytes},
            MaxLabels=5,
            MinConfidence=75
        )
        
        labels = [label['Name'] for label in response['Labels']]
        
        return {
            "statusCode": 200, 
            "headers": get_cors_headers(), 
            "body": json.dumps({"tags": labels})
        }
    except Exception as e:
        print(f"Error analyzing image: {str(e)}")
        return {"statusCode": 500, "headers": get_cors_headers(), "body": json.dumps({"error": "Failed to analyze image"})}
