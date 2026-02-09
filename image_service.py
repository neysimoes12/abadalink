import os
import cloudinary
import cloudinary.uploader

# Configure Cloudinary
cloudinary.config( 
  cloud_name = os.getenv("CLOUDINARY_CLOUD_NAME"), 
  api_key = os.getenv("CLOUDINARY_API_KEY"), 
  api_secret = os.getenv("CLOUDINARY_API_SECRET"),
  secure = True
)

def upload_image(file_file, folder="abadalink"):
    """
    Uploads a file-like object to Cloudinary.
    Returns the secure URL of the uploaded image.
    """
    try:
        # Check if Cloudinary is configured
        if not os.getenv("CLOUDINARY_CLOUD_NAME"):
            print("⚠️ Cloudinary credentials missing. Returning mock URL.")
            return "https://placehold.co/600x400/png?text=Imagem+Mock"

        response = cloudinary.uploader.upload(file_file, folder=folder)
        return response.get("secure_url")
    except Exception as e:
        print(f"Cloudinary Upload Error: {e}")
        return None
