import React, { useState, useRef, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ProgressBar } from 'primereact/progressbar';
import { Divider } from 'primereact/divider';
import { Image } from 'primereact/image';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { Panel } from 'primereact/panel';
import { Dropdown } from 'primereact/dropdown';
import { InputNumber } from 'primereact/inputnumber';
import { TabView, TabPanel } from 'primereact/tabview';

import diagnosisService from '../services/diagnosisService';

export default function TrainingPage() {
  const [trainingImages, setTrainingImages] = useState([]);
  const [selectedDiagnosis, setSelectedDiagnosis] = useState(null);
  const [collecting, setCollecting] = useState(false);
  const [trainingTaskId, setTrainingTaskId] = useState(null);
  const [trainingStatus, setTrainingStatus] = useState(null);
  const [epochs, setEpochs] = useState(30);
  const [batchSize, setBatchSize] = useState(16);
  const [modelType, setModelType] = useState('resnet50');
  const [showTrainingDialog, setShowTrainingDialog] = useState(false);
  
  const toast = useRef(null);
  const fileUploadRef = useRef(null);
  
  // Danh sách nhãn chẩn đoán
  const diagnoses = [
    { name: 'Melanoma', code: 'Melanoma' },
    { name: 'Nốt Ruồi Lành Tính', code: 'Nốt Ruồi Lành Tính' },
    { name: 'Ung Thư Biểu Mô', code: 'Ung Thư Biểu Mô' },
    { name: 'Tổn Thương Tiền Ung Thư', code: 'Tổn Thương Tiền Ung Thư' },
    { name: 'Bệnh Vẩy Nến', code: 'Bệnh Vẩy Nến' },
    { name: 'Chàm', code: 'Chàm' },
    { name: 'Da Khỏe Mạnh', code: 'Da Khỏe Mạnh' }
  ];
  
  // Danh sách loại mô hình
  const modelTypes = [
    { name: 'ResNet50', code: 'resnet50' },
    { name: 'EfficientNet', code: 'efficientnet' }
  ];
  
  // Kiểm tra trạng thái huấn luyện nếu có
  useEffect(() => {
    if (trainingTaskId) {
      const intervalId = setInterval(async () => {
        try {
          const response = await diagnosisService.getTrainingStatus(trainingTaskId);
          
          if (response.status === 'success') {
            setTrainingStatus(response.training_status);
            
            // Nếu huấn luyện đã hoàn tất, dừng việc kiểm tra
            if (response.training_status.status === 'completed' || 
                response.training_status.status === 'failed') {
              clearInterval(intervalId);
              
              // Hiển thị thông báo
              const severity = response.training_status.status === 'completed' ? 'success' : 'error';
              const summary = response.training_status.status === 'completed' ? 'Thành công' : 'Thất bại';
              const detail = response.training_status.status === 'completed' 
                ? 'Quá trình huấn luyện đã hoàn tất thành công' 
                : `Quá trình huấn luyện thất bại: ${response.training_status.error || 'Lỗi không xác định'}`;
              
              toast.current.show({ severity, summary, detail, life: 5000 });
            }
          }
        } catch (error) {
          console.error('Error checking training status:', error);
        }
      }, 5000); // Kiểm tra mỗi 5 giây
      
      return () => clearInterval(intervalId);
    }
  }, [trainingTaskId]);
  
  const onUpload = (e) => {
    const files = e.files;
    const uploadedImages = [...trainingImages];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImages.push({
          name: file.name,
          preview: e.target.result,
          date: new Date().toLocaleString(),
          status: 'Chưa gán nhãn',
          diagnosis: null,
          file: file
        });
        setTrainingImages([...uploadedImages]);
      };
      reader.readAsDataURL(file);
    });
    
    toast.current.show({ severity: 'success', summary: 'Thành công', detail: 'Đã tải ảnh lên', life: 3000 });
    fileUploadRef.current.clear();
  };
  
  const collectData = async (image) => {
    if (!image.diagnosis) {
      toast.current.show({ 
        severity: 'warn', 
        summary: 'Cảnh báo', 
        detail: 'Vui lòng chọn nhãn chẩn đoán trước', 
        life: 3000 
      });
      return;
    }
    
    setCollecting(true);
    
    try {
      // Gọi API để lưu dữ liệu huấn luyện
      const response = await diagnosisService.collectTrainingData(image.file, image.diagnosis);
      
      if (response.status === 'success') {
        // Cập nhật trạng thái của ảnh
        const updatedImages = trainingImages.map(img => {
          if (img.name === image.name) {
            return {
              ...img,
              status: 'Đã lưu',
              sample_id: response.sample_id
            };
          }
          return img;
        });
        
        setTrainingImages(updatedImages);
        toast.current.show({ 
          severity: 'success', 
          summary: 'Thành công', 
          detail: 'Đã lưu dữ liệu huấn luyện', 
          life: 3000 
        });
      } else {
        toast.current.show({ 
          severity: 'error', 
          summary: 'Lỗi', 
          detail: response.message, 
          life: 3000 
        });
      }
    } catch (error) {
      console.error('Error collecting data:', error);
      toast.current.show({ 
        severity: 'error', 
        summary: 'Lỗi', 
        detail: error.message || 'Không thể lưu dữ liệu huấn luyện', 
        life: 3000 
      });
    } finally {
      setCollecting(false);
    }
  };
  
  const collectAllData = async () => {
    const uncollectedImages = trainingImages.filter(img => 
      img.status !== 'Đã lưu' && img.diagnosis
    );
    
    if (uncollectedImages.length === 0) {
      toast.current.show({ 
        severity: 'info', 
        summary: 'Thông báo', 
        detail: 'Không có ảnh nào cần lưu', 
        life: 3000 
      });
      return;
    }
    
    setCollecting(true);
    
    for (const image of uncollectedImages) {
      try {
        // Gọi API để lưu dữ liệu huấn luyện
        const response = await diagnosisService.collectTrainingData(image.file, image.diagnosis);
        
        if (response.status === 'success') {
          // Cập nhật trạng thái của ảnh
          setTrainingImages(prevImages => 
            prevImages.map(img => {
              if (img.name === image.name) {
                return {
                  ...img,
                  status: 'Đã lưu',
                  sample_id: response.sample_id
                };
              }
              return img;
            })
          );
        }
      } catch (error) {
        console.error(`Error collecting data for ${image.name}:`, error);
      }
    }
    
    setCollecting(false);
    toast.current.show({ 
      severity: 'success', 
      summary: 'Hoàn tất', 
      detail: 'Đã lưu tất cả dữ liệu huấn luyện', 
      life: 3000 
    });
  };
  
  const startTraining = async () => {
    try {
      const response = await diagnosisService.startTraining({
        epochs,
        batch_size: batchSize,
        model_type: modelType
      });
      
      if (response.status === 'success') {
        setTrainingTaskId(response.task_id);
        toast.current.show({ 
          severity: 'success', 
          summary: 'Thành công', 
          detail: 'Đã bắt đầu quá trình huấn luyện', 
          life: 3000 
        });
        
        // Đóng dialog huấn luyện
        setShowTrainingDialog(false);
      } else {
        toast.current.show({ 
          severity: 'error', 
          summary: 'Lỗi', 
          detail: response.message, 
          life: 3000 
        });
      }
    } catch (error) {
      console.error('Error starting training:', error);
      toast.current.show({ 
        severity: 'error', 
        summary: 'Lỗi', 
        detail: error.message || 'Không thể bắt đầu huấn luyện', 
        life: 3000 
      });
    }
  };
  
  const setDiagnosis = (rowData, diagnosis) => {
    const updatedImages = trainingImages.map(img => {
      if (img.name === rowData.name) {
        return {
          ...img,
          diagnosis: diagnosis.code,
          diagnosisName: diagnosis.name,
          status: 'Chờ lưu'
        };
      }
      return img;
    });
    
    setTrainingImages(updatedImages);
  };
  
  const imagePreviewTemplate = (rowData) => {
    return (
      <div className="flex justify-content-center">
        <Image src={rowData.preview} alt={rowData.name} width="100" preview />
      </div>
    );
  };
  
  const statusTemplate = (rowData) => {
    const severity = 
      rowData.status === 'Đã lưu' ? 'success' :
      rowData.status === 'Chờ lưu' ? 'info' : 'warning';
    
    return <Tag value={rowData.status} severity={severity} />;
  };
  
  const diagnosisTemplate = (rowData) => {
    return (
      <Dropdown
        value={rowData.diagnosis ? { name: rowData.diagnosisName, code: rowData.diagnosis } : null}
        options={diagnoses}
        onChange={(e) => setDiagnosis(rowData, e.value)}
        optionLabel="name"
        placeholder="Chọn chẩn đoán"
        className="w-full"
      />
    );
  };
  
  const actionTemplate = (rowData) => {
    return (
      <div className="flex justify-content-center">
        <Button 
          icon="pi pi-save" 
          className="p-button-rounded p-button-success p-button-sm" 
          onClick={() => collectData(rowData)}
          disabled={!rowData.diagnosis || rowData.status === 'Đã lưu' || collecting}
          loading={collecting}
        />
      </div>
    );
  };
  
  // Header cho Card
  const cardHeader = (
    <div className="text-center py-5 bg-primary">
      <h1 className="text-4xl font-bold text-white m-0">Huấn Luyện Mô Hình AI</h1>
      <p className="text-lg text-white-alpha-80 mt-3 mb-0">Tải lên dữ liệu và huấn luyện mô hình chẩn đoán bệnh da thông minh</p>
    </div>
  );
  
  // Footer cho dialog huấn luyện
  const trainingDialogFooter = (
    <div>
      <Button label="Hủy" icon="pi pi-times" className="p-button-text" onClick={() => setShowTrainingDialog(false)} />
      <Button label="Bắt đầu huấn luyện" icon="pi pi-cog" className="p-button-success" onClick={startTraining} />
    </div>
  );
  
  return (
    <div className="surface-ground p-4">
      <Toast ref={toast} />
      
      <Card header={cardHeader} className="mb-4">
        <Divider />
        
        <div className="grid">
          <div className="col-12 md:col-6">
            <Panel header="Tải ảnh huấn luyện" className="mb-3">
              <FileUpload 
                ref={fileUploadRef}
                name="images" 
                url="/#" // Dummy URL
                multiple 
                accept="image/*" 
                maxFileSize={5000000}
                customUpload={true}
                uploadHandler={onUpload}
                emptyTemplate={
                  <div className="p-5 text-center">
                    <i className="pi pi-image text-4xl mb-3" style={{ color: '#DDD' }}></i>
                    <p>Kéo thả hoặc chọn hình ảnh da để huấn luyện mô hình</p>
                  </div>
                }
              />
            </Panel>
            
            <div className="flex justify-content-end gap-2 mb-3">
              <Button 
                label="Lưu tất cả ảnh đã gán nhãn" 
                icon="pi pi-save" 
                className="p-button-success" 
                onClick={collectAllData}
                disabled={collecting || trainingImages.filter(img => img.diagnosis && img.status !== 'Đã lưu').length === 0}
                loading={collecting}
              />
              <Button 
                label="Huấn luyện mô hình" 
                icon="pi pi-cog" 
                className="p-button-primary" 
                onClick={() => setShowTrainingDialog(true)}
                disabled={trainingImages.filter(img => img.status === 'Đã lưu').length === 0 || trainingTaskId && trainingStatus && ['running', 'preparing'].includes(trainingStatus.status)}
              />
            </div>
          </div>
          
          <div className="col-12 md:col-6">
            <Panel header="Thông tin huấn luyện" className="h-full">
              <p>
                Quá trình huấn luyện mô hình AI cần các bước sau:
              </p>
              <ol>
                <li>Tải lên hình ảnh bệnh da</li>
                <li>Gán nhãn chẩn đoán chính xác cho từng hình ảnh</li>
                <li>Lưu dữ liệu huấn luyện</li>
                <li>Bắt đầu quá trình huấn luyện</li>
              </ol>
              
              <p>
                Lưu ý: Quá trình huấn luyện có thể mất từ 15-30 phút tùy thuộc vào số lượng ảnh và cấu hình.
                Bạn có thể kiểm tra tiến trình huấn luyện bên dưới.
              </p>
              
              {trainingTaskId && trainingStatus && (
                <Panel header="Tiến trình huấn luyện" className="mt-3">
                  <div className="mb-3">
                    <span className="font-bold">Trạng thái: </span>
                    <Tag 
                      value={
                        trainingStatus.status === 'preparing' ? 'Đang chuẩn bị' :
                        trainingStatus.status === 'running' ? 'Đang huấn luyện' :
                        trainingStatus.status === 'completed' ? 'Hoàn thành' : 'Thất bại'
                      } 
                      severity={
                        trainingStatus.status === 'completed' ? 'success' :
                        trainingStatus.status === 'failed' ? 'danger' : 'info'
                      }
                    />
                  </div>
                  
                  <div className="mb-3">
                    <span className="font-bold">Tiến trình: </span>
                    <ProgressBar value={trainingStatus.progress} />
                  </div>
                  
                  <div className="mb-3">
                    <span className="font-bold">Thời gian bắt đầu: </span>
                    <span>{trainingStatus.start_time}</span>
                  </div>
                  
                  <div className="mb-3">
                    <span className="font-bold">Thông số: </span>
                    <span>Epochs: {trainingStatus.epochs}, Batch size: {trainingStatus.batch_size}, Model: {trainingStatus.model_type}</span>
                  </div>
                  
                  {trainingStatus.status === 'completed' && (
                    <div className="p-3 bg-green-50 text-green-700 border-round">
                      <i className="pi pi-check-circle mr-2"></i>
                      <span>Mô hình đã được huấn luyện thành công và đã được cập nhật vào hệ thống!</span>
                    </div>
                  )}
                  
                  {trainingStatus.status === 'failed' && (
                    <div className="p-3 bg-red-50 text-red-700 border-round">
                      <i className="pi pi-exclamation-triangle mr-2"></i>
                      <span>Huấn luyện thất bại: {trainingStatus.error || 'Lỗi không xác định'}</span>
                    </div>
                  )}
                </Panel>
              )}
            </Panel>
          </div>
        </div>
      </Card>
      
      <Card title="Danh sách hình ảnh huấn luyện" subTitle={`Tổng số: ${trainingImages.length}`} className="mb-4">
        <DataTable 
          value={trainingImages} 
          responsiveLayout="scroll" 
          emptyMessage="Chưa có hình ảnh nào được tải lên"
        >
          <Column field="name" header="Tên file" sortable />
          <Column header="Hình ảnh" body={imagePreviewTemplate} />
          <Column field="date" header="Ngày tạo" sortable />
          <Column header="Trạng thái" body={statusTemplate} sortable sortField="status" />
          <Column header="Chẩn đoán" body={diagnosisTemplate} />
          <Column header="Lưu" body={actionTemplate} />
        </DataTable>
      </Card>
      
      {/* Dialog cấu hình huấn luyện */}
      <Dialog 
        header="Cấu hình huấn luyện mô hình" 
        visible={showTrainingDialog} 
        style={{ width: '500px' }} 
        footer={trainingDialogFooter} 
        onHide={() => setShowTrainingDialog(false)}
      >
        <div className="p-fluid">
          <div className="field mb-4">
            <label htmlFor="modelType" className="font-bold mb-2">Loại mô hình</label>
            <Dropdown
              id="modelType"
              value={modelTypes.find(m => m.code === modelType)}
              options={modelTypes}
              onChange={(e) => setModelType(e.value.code)}
              optionLabel="name"
              placeholder="Chọn loại mô hình"
            />
            <small>ResNet50 thích hợp cho đa số trường hợp. EfficientNet hiệu quả hơn nhưng yêu cầu nhiều tài nguyên.</small>
          </div>
          
          <div className="field mb-4">
            <label htmlFor="epochs" className="font-bold mb-2">Số epochs</label>
            <InputNumber
              id="epochs"
              value={epochs}
              onValueChange={(e) => setEpochs(e.value)}
              min={10}
              max={100}
            />
            <small>Số lần lặp qua toàn bộ dữ liệu huấn luyện. Giá trị cao hơn có thể cải thiện độ chính xác nhưng mất nhiều thời gian hơn.</small>
          </div>
          
          <div className="field mb-4">
            <label htmlFor="batchSize" className="font-bold mb-2">Batch size</label>
            <InputNumber
              id="batchSize"
              value={batchSize}
              onValueChange={(e) => setBatchSize(e.value)}
              min={2}
              max={64}
              step={2}
            />
            <small>Số lượng mẫu được xử lý đồng thời. Giá trị nhỏ hơn sẽ sử dụng ít bộ nhớ hơn.</small>
          </div>
          
          <div className="p-3 bg-blue-50 text-blue-700 border-round mt-4">
            <i className="pi pi-info-circle mr-2"></i>
            <span>Quá trình huấn luyện có thể mất từ 15-30 phút. Bạn có thể đóng trang này và quay lại sau.</span>
          </div>
        </div>
      </Dialog>
    </div>
  );
}