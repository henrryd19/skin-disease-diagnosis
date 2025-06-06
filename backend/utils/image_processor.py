import cv2
import numpy as np
from PIL import Image
import io
import logging
from config.settings import IMAGE_SIZE

logger = logging.getLogger(__name__)

# TRONG FILE: utils/image_processor.py
class ImageProcessor:
    def __init__(self):
        try:
            self.target_size = IMAGE_SIZE
        except (NameError, AttributeError):
            self.target_size = (128, 128)
            logger.warning("IMAGE_SIZE not found in config, using default (128, 128)")
        
        self.supported_formats = {'PNG', 'JPEG', 'JPG', 'GIF', 'BMP', 'WEBP'}

    def process_uploaded_file(self, file):
        """Process uploaded file and return normalized array"""
        try:
            self.validate_image(file)
            file.seek(0)
            file_bytes = file.read()
            image = Image.open(io.BytesIO(file_bytes))
            
            logger.info(f"Original image: {image.format}, {image.size}, {image.mode}")
            
            if image.mode != 'RGB':
                logger.info(f"Converting from {image.mode} to RGB")
                image = image.convert('RGB')
            
            if image.size != self.target_size:
                logger.info(f"Resizing from {image.size} to {self.target_size}")
                image = image.resize(self.target_size, Image.Resampling.LANCZOS)
            
            image_array = np.array(image, dtype=np.float32)
            
            # Normalize to [0,1]
            if image_array.max() > 1.0:
                image_array = image_array / 255.0
            
            # DEBUG LOGS - ĐẶT ĐÚNG VỊ TRÍ
            print("Processed image shape:", image_array.shape)
            print("Image min/max values:", image_array.min(), image_array.max())
            print("Image dtype:", image_array.dtype)
            
            logger.info(f"Processed image shape: {image_array.shape}, dtype: {image_array.dtype}")
            logger.info(f"Value range: [{image_array.min():.3f}, {image_array.max():.3f}]")
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error processing uploaded file: {str(e)}")
            raise Exception(f"Không thể xử lý file ảnh: {str(e)}")
    
    def process_uploaded_file(self, file):
        """Process uploaded file and return normalized array"""
        try:
            # Validate image first
            self.validate_image(file)
            
            # Reset file pointer to beginning
            file.seek(0)
            
            # Read file bytes
            file_bytes = file.read()
            
            # Convert to PIL Image
            image = Image.open(io.BytesIO(file_bytes))
            
            # Log original image info
            logger.info(f"Original image: {image.format}, {image.size}, {image.mode}")
            
            # Convert to RGB if needed
            if image.mode != 'RGB':
                logger.info(f"Converting from {image.mode} to RGB")
                image = image.convert('RGB')
            
            # Resize to model input size
            if image.size != self.target_size:
                logger.info(f"Resizing from {image.size} to {self.target_size}")
                image = image.resize(self.target_size, Image.Resampling.LANCZOS)
            
            # Convert to numpy array
            image_array = np.array(image, dtype=np.float32)
            
            # Normalize to [0,1]
            if image_array.max() > 1.0:
                image_array = image_array / 255.0
            
            logger.info(f"Processed image shape: {image_array.shape}, dtype: {image_array.dtype}")
            logger.info(f"Value range: [{image_array.min():.3f}, {image_array.max():.3f}]")
            
            return image_array
            
        except Exception as e:
            logger.error(f"Error processing uploaded file: {str(e)}")
            raise Exception(f"Không thể xử lý file ảnh: {str(e)}")
    
    def preprocess_for_model(self, image_array):
        """Additional preprocessing steps for model input"""
        try:
            # Ensure correct dtype
            if image_array.dtype != np.float32:
                image_array = image_array.astype(np.float32)
            
            # Ensure correct range [0,1]
            if image_array.max() > 1.0:
                image_array = image_array / 255.0
            
            # Ensure correct shape - add batch dimension if needed
            if len(image_array.shape) == 3:
                # Add batch dimension
                image_array = np.expand_dims(image_array, axis=0)
            elif len(image_array.shape) == 2:
                # Add channel and batch dimensions for grayscale
                image_array = np.expand_dims(image_array, axis=-1)
                image_array = np.expand_dims(image_array, axis=0)
            
            logger.info(f"Model input shape: {image_array.shape}, dtype: {image_array.dtype}")
            
            return image_array
            
        except Exception as e:
            logger.error(f"Model preprocessing failed: {str(e)}")
            raise Exception(f"Lỗi chuẩn bị dữ liệu cho model: {str(e)}")
    
    @staticmethod
    def process_uploaded_file_static(file):
        """Static method for backward compatibility"""
        processor = ImageProcessor()
        return processor.process_uploaded_file(file)
    
    @staticmethod
    def preprocess_for_model_static(image_array):
        """Static method for backward compatibility"""
        processor = ImageProcessor()
        return processor.preprocess_for_model(image_array)
    
    def get_image_info(self, file):
        """Get basic information about uploaded image"""
        try:
            file.seek(0)
            image = Image.open(file)
            info = {
                'format': image.format,
                'size': image.size,
                'mode': image.mode,
                'width': image.size[0],
                'height': image.size[1]
            }
            file.seek(0)
            return info
        except Exception as e:
            logger.error(f"Error getting image info: {str(e)}")
            return None
    
    def resize_image(self, image_array, target_size=None):
        """Resize image array to target size"""
        if target_size is None:
            target_size = self.target_size
        
        # Convert numpy array back to PIL Image for resizing
        if image_array.max() <= 1.0:
            # Denormalize if normalized
            image_uint8 = (image_array * 255).astype(np.uint8)
        else:
            image_uint8 = image_array.astype(np.uint8)
        
        image = Image.fromarray(image_uint8)
        image_resized = image.resize(target_size, Image.Resampling.LANCZOS)
        
        # Convert back to array and normalize
        resized_array = np.array(image_resized, dtype=np.float32) / 255.0
        
        return resized_array