import json

def lambda_handler(event, context):
    email = event['request']['userAttributes'].get('email', '')
    if not email.endswith('@nycu.edu.tw'):
        raise Exception("Registration restricted to @nycu.edu.tw emails only.")
    return event
