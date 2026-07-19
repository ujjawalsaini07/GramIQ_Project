import os
import aiofiles
from fastapi import UploadFile
import uuid
from app.services.storage.base import StorageBackend

class LocalStorageBackend(StorageBackend):
    def __init__(self, upload_dir: str = "uploads"):
        self.upload_dir = upload_dir
        os.makedirs(self.upload_dir, exist_ok=True)

    async def save(self, file: UploadFile, content: bytes) -> str:
        """Saves file to local filesystem and returns a unique filename."""
        ext = os.path.splitext(file.filename)[1] if file.filename else ""
        unique_filename = f"{uuid.uuid4().hex}{ext}"
        filepath = os.path.join(self.upload_dir, unique_filename)
        
        async with aiofiles.open(filepath, 'wb') as out_file:
            await out_file.write(content)
            
        return unique_filename

    def url_for(self, filename: str) -> str:
        # Assuming frontend mounts or accesses via static route
        return f"/uploads/{filename}"
