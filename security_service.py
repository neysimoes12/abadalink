import boto3
import os
import logging
from botocore.exceptions import BotoCoreError, ClientError
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

load_dotenv()

class IdentityVerifier:
    def __init__(self):
        self.aws_access_key = os.getenv("AWS_ACCESS_KEY")
        self.aws_secret_key = os.getenv("AWS_SECRET_KEY")
        self.region_name = os.getenv("AWS_REGION", "us-east-1") # Default region if not specified

    def verify_face(self, source_image_bytes: bytes, target_image_bytes: bytes) -> bool:
        """
        Verifies if the face in source_image_bytes matches the face in target_image_bytes.
        Uses AWS Rekognition if credentials are available, otherwise mocks the response for dev mode.
        
        :param source_image_bytes: Bytes of the source image (e.g. ID photo)
        :param target_image_bytes: Bytes of the target image (e.g. Selfie)
        :return: True if faces match (similarity > 90%), False otherwise.
        """
        
        # Check if AWS credentials are set
        if not self.aws_access_key or not self.aws_secret_key or \
           self.aws_access_key in ["your_aws_access_key", "mocked_key"] or \
           self.aws_secret_key in ["your_aws_secret_key", "mocked_secret"]:
            
            logger.warning("AWS Credentials not found or default. RUNNING IN MOCK MODE. Returning True.")
            return True

        try:
            client = boto3.client(
                'rekognition',
                aws_access_key_id=self.aws_access_key,
                aws_secret_access_key=self.aws_secret_key,
                region_name=self.region_name
            )

            response = client.compare_faces(
                SourceImage={'Bytes': source_image_bytes},
                TargetImage={'Bytes': target_image_bytes},
                SimilarityThreshold=90
            )

            # Check if there are any matches
            face_matches = response.get('FaceMatches', [])
            
            if not face_matches:
                logger.info("No face matches found.")
                return False

            # Even though we set threshold in the call, good to double check or log
            logger.info(f"Face match found with similarity: {face_matches[0]['Similarity']}%")
            
            return True

        except (BotoCoreError, ClientError) as error:
            logger.error(f"AWS Rekognition Error: {error}")
            # In a real scenario you might want to re-raise or handle specific errors differently
            # For now, return False on error to be safe
            return False
        except Exception as e:
            logger.error(f"Unexpected error in verify_face: {e}")
            return False
