import boto3
import os
from dotenv import load_dotenv

# Load VITE_COGNITO_USER_POOL_ID from .env
load_dotenv('.env')

USER_POOL_ID = os.environ.get('VITE_COGNITO_USER_POOL_ID')
REGION = os.environ.get('VITE_AWS_REGION', 'ap-east-2')

def bootstrap_admin(email, temp_password):
    if not USER_POOL_ID:
        print("Error: VITE_COGNITO_USER_POOL_ID not found in .env")
        return

    client = boto3.client('cognito-idp', region_name=REGION)
    
    print(f"Creating admin user {email}...")
    try:
        # Create user
        client.admin_create_user(
            UserPoolId=USER_POOL_ID,
            Username=email,
            TemporaryPassword=temp_password,
            UserAttributes=[
                {'Name': 'email', 'Value': email},
                {'Name': 'email_verified', 'Value': 'true'}
            ],
            MessageAction='SUPPRESS' # Don't send welcome email
        )
        print("User created successfully.")
        
        # Add to Admins group
        print("Adding user to Admins group...")
        client.admin_add_user_to_group(
            UserPoolId=USER_POOL_ID,
            Username=email,
            GroupName='Admins'
        )
        print("Successfully added to Admins group.")
        
        print(f"\nSuccess! You can now log in with {email} and the temporary password.")
        print("Cognito will prompt you to set a permanent password on first login.")
        
    except client.exceptions.UsernameExistsException:
        print(f"User {email} already exists. Attempting to add to Admins group anyway...")
        try:
            client.admin_add_user_to_group(
                UserPoolId=USER_POOL_ID,
                Username=email,
                GroupName='Admins'
            )
            print("Successfully added existing user to Admins group.")
        except Exception as e:
            print(f"Failed to add to group: {e}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == '__main__':
    admin_email = input("Enter admin email (e.g. admin@nycu.edu.tw): ")
    admin_pass = input("Enter a temporary password: ")
    bootstrap_admin(admin_email, admin_pass)
