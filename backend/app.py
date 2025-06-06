from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import numpy as np
import tensorflow as tf
from PIL import Image
import io
import logging
import base64

app = Flask(__name__)
CORS(app, origins=[
    "http://localhost:3000", 
    "http://127.0.0.1:3000",
    "http://192.168.1.36:3000"
])

# Setup logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Configuration
MODEL_PATH = '/Users/macbook/Downloads/skin-cancer-detection/output/fixed_blank_model.h5'
CLASS_LABELS = [
    'Actinic Keratosis',
    'Basal Cell Carcinoma', 
    'Dermatofibroma',
    'Melanoma',
    'Nevus',
    'Pigmented Benign Keratosis',
    'Seborrheic Keratosis',
    'Squamous Cell Carcinoma',
    'Vascular Lesion'
]

# Vietnamese translations
CLASS_LABELS_VI = {
    'Actinic Keratosis': 'Tổn Thương Tiền Ung Thư',
    'Basal Cell Carcinoma': 'Ung Thư Biểu Mô Tế Bào Đáy',
    'Dermatofibroma': 'U Xơ Da',
    'Melanoma': 'Melanoma',
    'Nevus': 'Nốt Ruồi Lành Tính',
    'Pigmented Benign Keratosis': 'Sừng Hóa Lành Tính Có Sắc Tố',
    'Seborrheic Keratosis': 'Sừng Hóa Bã Nhờn',
    'Squamous Cell Carcinoma': 'Ung Thư Biểu Mô Vảy',
    'Vascular Lesion': 'Tổn Thương Mạch Máu'
}

IMAGE_SIZE = (128, 128)

class SkinCancerPredictor:
    def __init__(self):
        self.model = None
        self.model_loaded = False
        self.load_model()
    
    def load_model(self):
        """Load model với error handling cải thiện"""
        try:
            if not os.path.exists(MODEL_PATH):
                logger.error(f"❌ Model file không tồn tại: {MODEL_PATH}")
                return False
            
            logger.info(f"🔄 Đang load model từ: {MODEL_PATH}")
            
            # Method 1: Load với compile=False
            try:
                self.model = tf.keras.models.load_model(MODEL_PATH, compile=False)
                
                # Test model với dummy input
                test_input = np.random.random((1, 128, 128, 3)).astype(np.float32)
                test_output = self.model.predict(test_input, verbose=0)
                
                logger.info(f"✅ Model loaded thành công! Output shape: {test_output.shape}")
                logger.info(f"📊 Test prediction sum: {np.sum(test_output):.4f}")
                
                self.model_loaded = True
                return True
                
            except Exception as e1:
                logger.warning(f"⚠️ Method 1 failed: {e1}")
                
                # Method 2: Load với custom_objects
                try:
                    self.model = tf.keras.models.load_model(MODEL_PATH, compile=False)
                    # Compile lại model
                    self.model.compile(
                        optimizer='adam',
                        loss='categorical_crossentropy',
                        metrics=['accuracy']
                    )
                    
                    logger.info("✅ Model loaded và compiled lại thành công")
                    self.model_loaded = True
                    return True
                    
                except Exception as e2:
                    logger.error(f"❌ Method 2 failed: {e2}")
                    return False
                    
        except Exception as e:
            logger.error(f"❌ Load model failed: {e}")
            return False
    
    def preprocess_image(self, image_data):
        """Xử lý ảnh đầu vào"""
        try:
            # Xử lý base64 hoặc file upload
            if isinstance(image_data, str) and image_data.startswith('data:image'):
                # Remove data:image/jpeg;base64, prefix
                image_data = image_data.split(',')[1]
                image_bytes = base64.b64decode(image_data)
                image = Image.open(io.BytesIO(image_bytes))
            else:
                image = Image.open(io.BytesIO(image_data))
            
            # Convert to RGB nếu cần
            if image.mode != 'RGB':
                image = image.convert('RGB')
            
            # Resize ảnh
            image = image.resize(IMAGE_SIZE, Image.Resampling.LANCZOS)
            
            # Convert to numpy array
            image_array = np.array(image, dtype=np.float32)
            
            # Normalize về [0, 1]
            image_array = image_array / 255.0
            
            # Add batch dimension
            image_array = np.expand_dims(image_array, axis=0)
            
            logger.info(f"📸 Image preprocessed: shape={image_array.shape}, range=[{image_array.min():.3f}, {image_array.max():.3f}]")
            
            return image_array
            
        except Exception as e:
            logger.error(f"❌ Preprocess image failed: {e}")
            raise Exception(f"Lỗi xử lý ảnh: {str(e)}")
    
    def predict(self, image_array):
        """Dự đoán từ ảnh đã xử lý"""
        if not self.model_loaded:
            raise Exception("Model chưa được load thành công")
        
        try:
            # Get predictions
            predictions = self.model.predict(image_array, verbose=0)
            
            # Debug info
            logger.info(f"🔍 Raw predictions shape: {predictions.shape}")
            logger.info(f"🔍 Raw predictions sum: {np.sum(predictions[0]):.4f}")
            
            # Ensure predictions are probabilities
            if abs(np.sum(predictions[0]) - 1.0) > 0.1:
                # Apply softmax if needed
                predictions = tf.nn.softmax(predictions, axis=1).numpy()
                logger.info("✅ Applied softmax normalization")
            
            # Get top predictions
            pred_probs = predictions[0]
            
            # Create results
            results = []
            for i, (label, prob) in enumerate(zip(CLASS_LABELS, pred_probs)):
                results.append({
                    'class': label,
                    'class_vi': CLASS_LABELS_VI[label],
                    'confidence': float(prob),
                    'percentage': float(prob * 100)
                })
            
            # Sort by confidence
            results.sort(key=lambda x: x['confidence'], reverse=True)
            
            # Log top 3 predictions
            logger.info("🏆 Top 3 predictions:")
            for i, result in enumerate(results[:3]):
                logger.info(f"  {i+1}. {result['class']}: {result['percentage']:.2f}%")
            
            return results
            
        except Exception as e:
            logger.error(f"❌ Prediction failed: {e}")
            raise Exception(f"Lỗi dự đoán: {str(e)}")

# Initialize predictor
predictor = SkinCancerPredictor()

@app.before_request
def log_request():
    logger.info(f"🌐 {request.method} {request.url} from {request.remote_addr}")
    logger.info(f"📋 Headers: {dict(request.headers)}")
    logger.info(f"🔗 Full path: {request.full_path}")

@app.after_request
def log_response(response):
    logger.info(f"📤 Response: {response.status_code}")
    return response
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': predictor.model_loaded,
        'tensorflow_version': tf.__version__
    })

@app.route('/api/predict', methods=['POST'])  # Giữ nguyên endpoint như code gốc
def predict_image():
    """Predict skin lesion from image"""
    try:
        # Check if model is loaded
        if not predictor.model_loaded:
            return jsonify({
                'success': False,
                'error': 'Model chưa được load thành công'
            }), 500
        
        # Check if image is provided
        if 'image' not in request.files and 'image' not in request.json:
            return jsonify({
                'success': False,
                'error': 'Không tìm thấy ảnh trong request'
            }), 400
        
        # Get image data
        if 'image' in request.files:
            # File upload
            file = request.files['image']
            if file.filename == '':
                return jsonify({
                    'success': False,
                    'error': 'Không có file được chọn'
                }), 400
            image_data = file.read()
        else:
            # Base64 image
            image_data = request.json.get('image')
        
        # Preprocess image
        image_array = predictor.preprocess_image(image_data)
        
        # Make prediction
        results = predictor.predict(image_array)
        
        # Return results
        return jsonify({
            'success': True,
            'predictions': results,
            'top_prediction': results[0] if results else None,
            'model_info': {
                'classes': len(CLASS_LABELS),
                'input_size': IMAGE_SIZE
            }
        })
        
    except Exception as e:
        logger.error(f"❌ API Error: {e}")
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/classes', methods=['GET'])
def get_classes():
    """Get all available classes"""
    classes = []
    for label in CLASS_LABELS:
        classes.append({
            'class': label,
            'class_vi': CLASS_LABELS_VI[label]
        })
    
    return jsonify({
        'success': True,
        'classes': classes
    })

@app.route('/health', methods=['GET'])  # Add this line!
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'model_loaded': predictor.model_loaded,
        'tensorflow_version': tf.__version__
    })

@app.errorhandler(413)
def too_large(e):
    """Handle file too large error"""
    return jsonify({
        'success': False,
        'error': 'File quá lớn. Vui lòng chọn ảnh nhỏ hơn 16MB'
    }), 413

@app.route('/', methods=['GET'])
def home():
    """Root endpoint"""
    return jsonify({
        'message': 'Skin Cancer Detection API',
        'status': 'running',
        'version': '1.0'
    })

if __name__ == '__main__':
    # Set max file size (16MB)
    app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
    
    # Print startup info
    print("🚀 Starting Skin Cancer Detection API...")
    print(f"📁 Model path: {MODEL_PATH}")
    print(f"🏥 Classes: {len(CLASS_LABELS)}")
    print(f"📊 Image size: {IMAGE_SIZE}")
    print(f"🤖 Model loaded: {predictor.model_loaded}")
    
    # Print all available routes
    print("\n🛣️ Available routes:")
    for rule in app.url_map.iter_rules():
        print(f"  {rule.methods} {rule.rule}")
    
    if predictor.model_loaded:
        print("✅ API sẵn sàng!")
    else:
        print("❌ Model chưa load được - cần kiểm tra lại!")
    
    app.run(debug=True, host='0.0.0.0', port=5000)