import zipfile
import os

def zip_project(output_filename):
    # Files and folders to exclude
    exclude_folders = {
        'node_modules', 
        '.git', 
        'output', 
        'background_clips', 
        'dist', 
        '.tempmediaStorage',
        '__pycache__',
        'venv',
        '.env'
    }
    exclude_files = {
        'autovid_final.zip',
        'autovid.zip'
    }

    with zipfile.ZipFile(output_filename, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk('.'):
            # Remove excluded directories from search
            dirs[:] = [d for d in dirs if d not in exclude_folders]
            
            for file in files:
                if file in exclude_files:
                    continue
                
                file_path = os.path.join(root, file)
                # Create archive path (relative to current directory)
                archive_path = os.path.relpath(file_path, '.')
                
                print(f"Adding: {archive_path}")
                zipf.write(file_path, archive_path)

if __name__ == "__main__":
    zip_project('autovid_final.zip')
    print("\n✅ Success! Project packaged into 'autovid_final.zip'")
