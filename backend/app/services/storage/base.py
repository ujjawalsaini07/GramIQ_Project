from abc import ABC, abstractmethod
from fastapi import UploadFile

class StorageBackend(ABC):
    @abstractmethod
    async def save(self, file: UploadFile, content: bytes) -> str:
        """Saves a file and returns the filename/key."""
        pass

    @abstractmethod
    def url_for(self, filename: str) -> str:
        """Returns a URL to access the saved file."""
        pass
