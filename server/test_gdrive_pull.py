import os.path
import io
from google.auth.transport.requests import Request
from google.oauth2.credentials import Credentials
from google_auth_oauthlib.flow import InstalledAppFlow
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
from googleapiclient.http import MediaIoBaseDownload

# If modifying these scopes, delete the file token.json.
SCOPES = ["https://www.googleapis.com/auth/drive.readonly"]

def test_and_pull():
    creds = None
    # The file token.json stores the user's access and refresh tokens
    if os.path.exists("token.json"):
        creds = Credentials.from_authorized_user_file("token.json", SCOPES)
    
    if not creds or not creds.valid:
        if creds and creds.expired and creds.refresh_token:
            creds.refresh(Request())
        else:
            # Using the credentials file I moved for you
            flow = InstalledAppFlow.from_client_secrets_file(
                "google_credentials.json", SCOPES
            )
            # FIXED PORT TO MATCH GOOGLE CLOUD SETTINGS
            creds = flow.run_local_server(port=5000)
            
        with open("token.json", "w") as token:
            token.write(creds.to_json())

    try:
        service = build("drive", "v3", credentials=creds)

        # 1. Search for the folder "background gaming clips"
        print("Searching for folder: 'background gaming clips'...")
        results = service.files().list(
            q="name = 'background gaming clips' and mimeType = 'application/vnd.google-apps.folder' and trashed = false",
            fields="files(id, name)"
        ).execute()
        items = results.get("files", [])

        if not items:
            print("Could not find a folder named 'background gaming clips'. Checking all folders...")
            results = service.files().list(
                q="mimeType = 'application/vnd.google-apps.folder' and trashed = false",
                fields="files(id, name)"
            ).execute()
            all_folders = results.get("files", [])
            print("Found these folders instead:")
            for f in all_folders:
                print(f"- {f['name']} (ID: {f['id']})")
            return

        folder_id = items[0]['id']
        print(f"Found folder! ID: {folder_id}")

        # 2. List videos in that folder
        print("Looking for video files...")
        results = service.files().list(
            q=f"'{folder_id}' in parents and mimeType contains 'video/' and trashed = false",
            fields="files(id, name)"
        ).execute()
        videos = results.get("files", [])

        if not videos:
            print("No video files found in that folder.")
            return

        target_video = videos[0]
        print(f"Found video: {target_video['name']}")

        # 3. Download the first video
        print(f"Downloading {target_video['name']}...")
        request = service.files().get_media(fileId=target_video['id'])
        file_path = os.path.join(os.getcwd(), f"test_background_{target_video['name']}")
        
        fh = io.FileIO(file_path, 'wb')
        downloader = MediaIoBaseDownload(fh, request)
        done = False
        while done is False:
            status, done = downloader.next_chunk()
            print(f"Download {int(status.progress() * 100)}%.")

        print(f"Success! Video saved to: {file_path}")

    except HttpError as error:
        print(f"An error occurred: {error}")
    except Exception as e:
        print(f"Unexpected error: {e}")

if __name__ == "__main__":
    test_and_pull()
