import cloudinary
import cloudinary.uploader
import logging
from app.config import settings

logger = logging.getLogger(__name__)

class CloudinaryServiceError(Exception):
    pass

class CloudinaryService:
    _initialized = False

    @classmethod
    def _initialize(cls):
        if not cls._initialized:
            if not all([settings.CLOUDINARY_CLOUD_NAME, settings.CLOUDINARY_API_KEY, settings.CLOUDINARY_API_SECRET]):
                raise CloudinaryServiceError("Cloudinary credentials are not fully configured in environment variables.")
            
            cloudinary.config(
                cloud_name=settings.CLOUDINARY_CLOUD_NAME,
                api_key=settings.CLOUDINARY_API_KEY,
                api_secret=settings.CLOUDINARY_API_SECRET,
                secure=True
            )
            cls._initialized = True

    @classmethod
    async def upload_image(cls, file_bytes: bytes, filename: str) -> str:
        """
        Uploads image bytes to Cloudinary under the 'GRAMIQ' folder.
        Returns the secure URL of the uploaded image.
        """
        cls._initialize()
        
        try:
            import io
            # We must pass the bytes to the uploader. 
            # Cloudinary uploader accepts file paths, urls, or file-like objects
            result = cloudinary.uploader.upload(
                io.BytesIO(file_bytes),
                folder="GRAMIQ",
                resource_type="image",
                public_id=filename.split('.')[0] if '.' in filename else filename
            )
            
            secure_url = result.get("secure_url")
            if not secure_url:
                raise CloudinaryServiceError("Failed to retrieve secure URL from Cloudinary response.")
                
            return secure_url
            
        except Exception as e:
            logger.error(f"Cloudinary upload failed: {str(e)}")
            raise CloudinaryServiceError(f"Cloudinary upload failed: {str(e)}")
