import os
import json
import numpy as np
import pandas as pd
from PIL import Image
import concurrent.futures
import multiprocessing
import logging
from tensorflow.keras.preprocessing.image import ImageDataGenerator
from tensorflow.keras.utils import to_categorical
from sklearn.model_selection import train_test_split

# Thiết lập logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

def create_dataframe(data_dir, label_inverse_map):
    """Tạo DataFrame từ thư mục chứa ảnh và map tên thư mục thành nhãn số."""
    try:
        if not os.path.exists(data_dir):
            raise FileNotFoundError(f"Thư mục {data_dir} không tồn tại.")

        data = []
        for cls_name in sorted(os.listdir(data_dir)):
            cls_path = os.path.join(data_dir, cls_name)
            if not os.path.isdir(cls_path):
                continue

            label = label_inverse_map.get(cls_name)
            if label is None:
                logger.warning(f"Bỏ qua thư mục không có trong label_inverse_map: {cls_name}")
                continue

            for fname in os.listdir(cls_path):
                fpath = os.path.join(cls_path, fname)
                if os.path.isfile(fpath):
                    data.append({"image_path": fpath, "label": label})

        logger.info(f"Tạo DataFrame từ {data_dir} với {len(data)} mẫu.")
        return pd.DataFrame(data)

    except Exception as e:
        logger.error(f"Lỗi khi tạo DataFrame: {str(e)}")
        raise

def resize_image_array(image_path):
    """Resize ảnh về kích thước xác định."""
    try:
        return np.asarray(Image.open(image_path).convert("RGB").resize((128, 128)))
    except Exception as e:
        logger.warning(f"Lỗi khi resize ảnh {image_path}: {str(e)}")
        return None

def load_and_preprocess_data(config):
    """Tải, tiền xử lý và cân bằng dữ liệu từ thư mục train/test."""
    try:
        train_dir = config['data']['train_dir']
        test_dir = config['data']['test_dir']
        max_per_class = config['data']['max_per_class']
        output_dir = config['output']['output_dir']

        # Lấy danh sách class từ thư mục thật sự
        class_names = sorted([
            d for d in os.listdir(train_dir)
            if os.path.isdir(os.path.join(train_dir, d))
        ])
        label_map = {i: name for i, name in enumerate(class_names)}
        label_inverse_map = {v: k for k, v in label_map.items()}
        num_classes = len(label_map)
        logger.info(f"Số lớp: {num_classes}, Label map: {label_map}")

        # Ghi label_map ra file JSON
        with open(os.path.join(output_dir, "label_map.json"), "w") as f:
            json.dump(label_map, f)

        # Tạo DataFrame
        df_train = create_dataframe(train_dir, label_inverse_map)
        df_test = create_dataframe(test_dir, label_inverse_map)
        df = pd.concat([df_train, df_test], ignore_index=True)

        # Giới hạn mỗi class
        df = df.groupby('label').head(max_per_class).reset_index(drop=True)

        # Resize ảnh song song
        with concurrent.futures.ThreadPoolExecutor(max_workers=multiprocessing.cpu_count()) as executor:
            df['image'] = list(executor.map(resize_image_array, df['image_path']))

        # Loại ảnh lỗi
        df = df.dropna(subset=['image']).reset_index(drop=True)
        logger.info(f"Số mẫu sau khi loại lỗi: {len(df)}")

        # Data augmentation
        datagen = ImageDataGenerator(
            rotation_range=25,
            width_shift_range=0.5,
            height_shift_range=0.25,
            shear_range=0.25,
            zoom_range=0.25,
            horizontal_flip=True,
            fill_mode='nearest'
        )

        aug_df = pd.DataFrame(columns=['image_path', 'label', 'image'])
        for lbl in df['label'].unique():
            cls_df = df[df['label'] == lbl]
            aug_df = pd.concat([aug_df, cls_df], ignore_index=True)
            n_need = max_per_class - len(cls_df)
            if n_need > 0:
                imgs = cls_df['image'].values
                sel = np.random.choice(imgs, n_need, replace=True)
                for img in sel:
                    batch = np.expand_dims(img, 0)
                    aug_iter = datagen.flow(batch, batch_size=1)
                    aug = aug_iter.__next__()[0].astype('uint8')
                    new_row = pd.DataFrame([{'image_path': None, 'label': lbl, 'image': aug}])
                    aug_df = pd.concat([aug_df, new_row], ignore_index=True)

        # Cân bằng và shuffle
        df = aug_df.groupby('label').head(max_per_class).sample(frac=1, random_state=42).reset_index(drop=True)
        logger.info(f"Số mẫu sau cân bằng: {len(df)}")

        # Chuẩn bị dữ liệu
        X = np.stack(df['image'].values)
        y = to_categorical(df['label'].values, num_classes=num_classes)

        # Chuẩn hóa
        mean, std = X.mean(), X.std()
        if std == 0:
            raise ValueError("Độ lệch chuẩn bằng 0, không thể chuẩn hóa.")
        X = (X - mean) / std

        # Chia dữ liệu
        X_train_val, X_test, y_train_val, y_test = train_test_split(
            X, y, test_size=0.2, random_state=42, stratify=y
        )
        X_train, X_val, y_train, y_val = train_test_split(
            X_train_val, y_train_val, test_size=0.2, random_state=42, stratify=y_train_val
        )

        logger.info(f"Kích thước dữ liệu: X_train={X_train.shape}, X_val={X_val.shape}, X_test={X_test.shape}")
        return X_train, X_val, X_test, y_train, y_val, y_test, label_map

    except Exception as e:
        logger.error(f"Lỗi khi tiền xử lý dữ liệu: {str(e)}")
        raise
