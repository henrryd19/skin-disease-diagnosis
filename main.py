import os
import numpy as np
import pandas as pd
from src.data_preprocessing import load_and_preprocess_data
from src.model import build_model
from src.train import train_model
from src.evaluate import evaluate_model
from src.visualize import (
    plot_data_distribution,
    plot_sample_images,
    plot_training_history,
    predict_random_samples
)
from src.utils import check_hardware, load_config
import logging

# Thiết lập logging
os.makedirs('output', exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    filename='output/output.log',
    filemode='w'
)
logger = logging.getLogger(__name__)

def main():
    """Điểm vào chính để chạy pipeline phát hiện ung thư da."""
    try:
        # Tải cấu hình
        config = load_config('config/config.yaml')

        # Kiểm tra phần cứng (GPU/CPU)
        check_hardware()

        # Tạo thư mục đầu ra
        output_dir = config['output']['output_dir']
        os.makedirs(output_dir, exist_ok=True)

        # Tiền xử lý dữ liệu
        X_train, X_val, X_test, y_train, y_val, y_test, label_map = load_and_preprocess_data(config)

        # Trực quan hóa phân bố dữ liệu
        counts = np.bincount(y_train.argmax(axis=1))
        plot_data_distribution(counts, label_map, output_dir)

        # Hiển thị ảnh mẫu
        df = pd.DataFrame({'label': np.argmax(y_train, axis=1), 'image': list(X_train)})
        plot_sample_images(df, label_map, num_samples=9, output_dir=output_dir)

        # Xây dựng mô hình
        model = build_model(config)

        # Huấn luyện mô hình
        model, history = train_model(model, X_train, y_train, X_val, y_val, config)

        # Vẽ biểu đồ loss/accuracy
        plot_training_history(history, output_dir)

        # Đánh giá trên tập test
        mean_auc = evaluate_model(model, X_test, y_test, label_map, output_dir)

        # Dự đoán mẫu ngẫu nhiên
        predict_random_samples(model, X_test, y_test, label_map, num_samples=6, output_dir=output_dir)

        # Lưu mô hình
        model_path = os.path.join(output_dir, "skin_cancer_model.h5")
        model.save(model_path)
        logger.info(f"✅ Mô hình đã được lưu tại: {model_path}")

    except Exception as e:
        logger.error(f"❌ Lỗi trong pipeline chính: {str(e)}")
        raise

if __name__ == "__main__":
    main()
