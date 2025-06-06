
# config/settings.py
import os

# Model configuration
MODEL_PATH = '/Users/macbook/Downloads/skin-cancer-detection/output/skin_cancer_model_converted.h5'
# Hoặc đường dẫn tuyệt đối: MODEL_PATH = "/path/to/your/model.h5"

# Image processing configuration
IMAGE_SIZE = (128, 128)

# Class labels - ĐẢM BẢO THỨ TỰ ĐÚNG VỚI MODEL
CLASS_LABELS = [
    "Pigmented Benign Keratosis",  # 0
    "Melanoma",                    # 1
    "Vascular Lesion",             # 2
    "Actinic Keratosis",           # 3
    "Squamous Cell Carcinoma",     # 4
    "Basal Cell Carcinoma",        # 5
    "Seborrheic Keratosis",        # 6
    "Dermatofibroma",              # 7
    "Nevus"                        # 8
]

# API configuration
API_VERSION = "1.0.0"
DEBUG_MODE = True

# Model performance metrics (from training)
MODEL_METRICS = {
    'accuracy': 0.92,
    'mean_auc': 0.99,
    'precision': 0.89,
    'recall': 0.91,
    'f1_score': 0.90
}

print(f"Model path configured: {MODEL_PATH}")
print(f"Model file exists: {os.path.exists(MODEL_PATH)}")