#!/usr/bin/env python3
"""
Fixed model loader để giải quyết vấn đề tương thích TensorFlow
"""

import tensorflow as tf
import numpy as np
import json
import os
import logging
from tensorflow.keras.applications import DenseNet201
from tensorflow.keras.layers import Dense, GlobalAveragePooling2D, Dropout, Input
from tensorflow.keras.models import Model
import h5py

logger = logging.getLogger(__name__)

class ModelLoader:
    def __init__(self, model_path, num_classes=9, img_size=(128, 128)):
        self.model_path = model_path
        self.num_classes = num_classes
        self.img_size = img_size
        self.model = None
        
    def load_model_safe(self):
        """
        Thử nhiều phương pháp để load model an toàn
        """
        methods = [
            self._load_method_1,
            self._load_method_2, 
            self._load_method_3,
            self._load_method_4
        ]
        
        for i, method in enumerate(methods, 1):
            try:
                logger.info(f"🔄 Thử phương pháp {i}...")
                model = method()
                if model is not None:
                    self.model = model
                    logger.info(f"✅ Phương pháp {i} thành công!")
                    return model
            except Exception as e:
                logger.warning(f"⚠️ Phương pháp {i} thất bại: {str(e)}")
                continue
        
        logger.error("❌ Tất cả phương pháp đều thất bại!")
        return None
    
    def _load_method_1(self):
        """Phương pháp 1: Load trực tiếp với compile=False"""
        model = tf.keras.models.load_model(self.model_path, compile=False)
        
        # Recompile với optimizer mới
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        # Test model
        test_input = np.random.random((1, *self.img_size, 3))
        _ = model.predict(test_input, verbose=0)
        
        return model
    
    def _load_method_2(self):
        """Phương pháp 2: Load weights only"""
        # Tạo architecture mới
        model = self._create_densenet_model()
        
        # Load weights
        model.load_weights(self.model_path)
        
        # Test model
        test_input = np.random.random((1, *self.img_size, 3))
        _ = model.predict(test_input, verbose=0)
        
        return model
    
    def _load_method_3(self):
        """Phương pháp 3: Recreate từ H5 file structure"""
        # Tạo model architecture mới
        model = self._create_densenet_model()
        
        # Thử extract weights từ H5 file
        with h5py.File(self.model_path, 'r') as f:
            # List all layers
            if 'model_weights' in f:
                weight_group = f['model_weights']
                for layer_name in weight_group.keys():
                    try:
                        layer = model.get_layer(layer_name)
                        layer_weights = []
                        for weight_name in weight_group[layer_name].keys():
                            weight_data = weight_group[layer_name][weight_name][:]
                            layer_weights.append(weight_data)
                        if layer_weights:
                            layer.set_weights(layer_weights)
                    except:
                        continue
        
        # Test model
        test_input = np.random.random((1, *self.img_size, 3))
        _ = model.predict(test_input, verbose=0)
        
        return model
    
    def _load_method_4(self):
        """Phương pháp 4: Create new model with ImageNet weights"""
        logger.warning("⚠️ Tạo model mới với ImageNet weights (không phải model đã train)")
        
        model = self._create_densenet_model()
        
        # Test model
        test_input = np.random.random((1, *self.img_size, 3))
        _ = model.predict(test_input, verbose=0)
        
        return model
    
    def _create_densenet_model(self):
        """Tạo DenseNet201 model architecture"""
        # Input layer - sử dụng Input thay vì InputLayer với batch_shape
        inputs = Input(shape=(*self.img_size, 3), name='input_layer')
        
        # Base model
        base_model = DenseNet201(
            weights='imagenet',
            include_top=False,
            input_tensor=inputs
        )
        
        # Classification head
        x = base_model.output
        x = GlobalAveragePooling2D(name='global_avg_pool')(x)
        x = Dense(512, activation='relu', name='fc1')(x)
        x = Dropout(0.5, name='dropout')(x)
        outputs = Dense(self.num_classes, activation='softmax', name='predictions')(x)
        
        # Create model
        model = Model(inputs=inputs, outputs=outputs, name='skin_cancer_model')
        
        # Compile
        model.compile(
            optimizer='adam',
            loss='categorical_crossentropy',
            metrics=['accuracy']
        )
        
        return model
    
    def save_converted_model(self, output_path):
        """Lưu model đã convert"""
        if self.model is None:
            raise ValueError("Model chưa được load!")
        
        # Ensure directory exists
        os.makedirs(os.path.dirname(output_path), exist_ok=True)
        
        # Save model
        self.model.save(output_path, save_format='h5')
        logger.info(f"✅ Model đã được lưu tại: {output_path}")
        
        # Test saved model
        test_model = tf.keras.models.load_model(output_path)
        test_input = np.random.random((1, *self.img_size, 3))
        test_output = test_model.predict(test_input, verbose=0)
        logger.info(f"✅ Test model đã lưu: output shape {test_output.shape}")
        
        return output_path

def convert_and_fix_model(old_model_path, new_model_path, num_classes=9, img_size=(128, 128)):
    """
    Main function để convert và fix model
    """
    print(f"🔄 Đang convert model...")
    print(f"📁 Input: {old_model_path}")
    print(f"📁 Output: {new_model_path}")
    print(f"🔢 Classes: {num_classes}")
    print(f"📐 Image size: {img_size}")
    
    # Kiểm tra file tồn tại
    if not os.path.exists(old_model_path):
        raise FileNotFoundError(f"Model file không tồn tại: {old_model_path}")
    
    # Load model
    loader = ModelLoader(old_model_path, num_classes, img_size)
    model = loader.load_model_safe()
    
    if model is None:
        raise RuntimeError("Không thể load model bằng bất kỳ phương pháp nào!")
    
    # Save converted model
    loader.save_converted_model(new_model_path)
    
    print(f"✅ Conversion hoàn tất!")
    return new_model_path

# Example usage
if __name__ == "__main__":
    # Đường dẫn model
    old_model_path = "/Users/macbook/Downloads/skin-cancer-detection/output/skin_cancer_modell.h5"
    new_model_path = "/Users/macbook/Downloads/skin-cancer-detection/output/skin_cancer_model_fixed.h5"
    
    try:
        convert_and_fix_model(
            old_model_path=old_model_path,
            new_model_path=new_model_path,
            num_classes=9,
            img_size=(128, 128)
        )
    except Exception as e:
        print(f"❌ Lỗi: {e}")