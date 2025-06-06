
import 'primereact/resources/themes/lara-light-indigo/theme.css';  // theme
import 'primereact/resources/primereact.min.css';                  // core css
import 'primeicons/primeicons.css';                               // icons
import 'primeflex/primeflex.css';    

import React, { useState, useRef, useEffect } from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { FileUpload } from 'primereact/fileupload';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { ProgressSpinner } from 'primereact/progressspinner';
import { Image } from 'primereact/image';
import { Toast } from 'primereact/toast';
import { Tag } from 'primereact/tag';
import { Dialog } from 'primereact/dialog';
import { Panel } from 'primereact/panel';
import diagnosisService from '../services/diagnosisService';

export default function DiagnosisPage() {
  const [images, setImages] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [detailsDialog, setDetailsDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('checking');
  
  const toast = useRef(null);
  const fileUploadRef = useRef(null);
  
  // Test connection on mount
  useEffect(() => {
    testConnection();
  }, []);

  const testConnection = async () => {
    try {
      await diagnosisService.testConnection();
      setConnectionStatus('connected');
      toast.current?.show({ 
        severity: 'success', 
        summary: 'Kết nối thành công', 
        detail: 'API server đã sẵn sàng', 
        life: 3000 
      });
    } catch (error) {
      setConnectionStatus('disconnected');
      toast.current?.show({ 
        severity: 'error', 
        summary: 'Lỗi kết nối', 
        detail: 'Không thể kết nối với API server', 
        life: 5000 
      });
    }
  };

  const onUpload = (e) => {
    const files = e.files;
    const uploadedImages = [...images];
    
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        uploadedImages.push({
          id: Date.now() + Math.random(), // Unique ID
          name: file.name,
          preview: e.target.result,
          date: new Date().toLocaleString(),
          status: 'Chưa phân tích',
          file: file
        });
        setImages([...uploadedImages]);
      };
      reader.readAsDataURL(file);
    });
    
    toast.current?.show({ 
      severity: 'success', 
      summary: 'Thành công', 
      detail: `Đã tải lên ${files.length} ảnh`, 
      life: 3000 
    });
    fileUploadRef.current?.clear();
  };

  const analyzeImage = async (imageToAnalyze) => {
    try {
      console.log('Bắt đầu phân tích ảnh:', imageToAnalyze.name);
      
      const response = await diagnosisService.analyzeImage(imageToAnalyze.file);
      console.log('Kết quả từ API:', response);
      
      if (response.status === 'success' && response.result?.topResult) {
        // Update image with result
        setImages(prevImages => 
          prevImages.map(img => 
            img.id === imageToAnalyze.id ? {
              ...img,
              status: 'Đã phân tích',
              result: response.result.topResult,
              allPredictions: response.result.allPredictions || []
            } : img
          )
        );
        
        toast.current?.show({ 
          severity: 'success', 
          summary: 'Phân tích thành công', 
          detail: `${imageToAnalyze.name}: ${response.result.topResult.diagnosis} (${response.result.topResult.confidence}%)`, 
          life: 5000 
        });
        
        return true;
      } else {
        throw new Error('Phản hồi không hợp lệ từ server');
      }
    } catch (error) {
      console.error('Lỗi phân tích:', error);
      
      // Update image with error status
      setImages(prevImages => 
        prevImages.map(img => 
          img.id === imageToAnalyze.id ? {
            ...img,
            status: 'Lỗi phân tích',
            error: error.message
          } : img
        )
      );
      
      toast.current?.show({ 
        severity: 'error', 
        summary: 'Lỗi phân tích', 
        detail: `${imageToAnalyze.name}: ${error.message}`, 
        life: 5000 
      });
      
      return false;
    }
  };

  const analyzeAllImages = async () => {
    if (images.length === 0) {
      toast.current?.show({ 
        severity: 'warn', 
        summary: 'Cảnh báo', 
        detail: 'Vui lòng tải lên ít nhất một hình ảnh', 
        life: 3000 
      });
      return;
    }
    
    if (connectionStatus !== 'connected') {
      toast.current?.show({ 
        severity: 'error', 
        summary: 'Lỗi kết nối', 
        detail: 'Không thể kết nối với server', 
        life: 3000 
      });
      return;
    }

    const unanalyzedImages = images.filter(img => img.status === 'Chưa phân tích');
    
    if (unanalyzedImages.length === 0) {
      toast.current?.show({ 
        severity: 'info', 
        summary: 'Thông báo', 
        detail: 'Tất cả hình ảnh đã được phân tích', 
        life: 3000 
      });
      return;
    }

    setAnalyzing(true);
    
    let successCount = 0;
    let errorCount = 0;
    
    for (const img of unanalyzedImages) {
      const success = await analyzeImage(img);
      if (success) {
        successCount++;
      } else {
        errorCount++;
      }
      
      // Delay giữa các request để tránh overload server
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    
    setAnalyzing(false);
    
    toast.current?.show({ 
      severity: successCount > 0 ? 'success' : 'error', 
      summary: 'Hoàn tất', 
      detail: `Thành công: ${successCount}, Lỗi: ${errorCount}`, 
      life: 5000 
    });
  };

  const showDetails = (image) => {
    setSelectedImage(image);
    setDetailsDialog(true);
  };

  // Templates cho DataTable
  const imagePreviewTemplate = (rowData) => (
    <div className="flex justify-content-center">
      <Image src={rowData.preview} alt={rowData.name} width="80" preview />
    </div>
  );

  const statusTemplate = (rowData) => {
    let severity = 'warning';
    if (rowData.status === 'Đã phân tích') severity = 'success';
    if (rowData.status === 'Lỗi phân tích') severity = 'danger';
    
    return <Tag value={rowData.status} severity={severity} />;
  };

  const resultTemplate = (rowData) => {
    if (rowData.status === 'Lỗi phân tích') {
      return <span className="text-red-500">{rowData.error}</span>;
    }
    
    if (rowData.status !== 'Đã phân tích' || !rowData.result) {
      return <span className="text-gray-500">Chưa có kết quả</span>;
    }
    
    const { diagnosis, confidence } = rowData.result;
    const severity = ['Melanoma', 'Ung Thư Biểu Mô'].includes(diagnosis) ? 'danger' :
                   diagnosis === 'Tổn Thương Tiền Ung Thư' ? 'warning' : 'success';
    
    return (
      <div className="flex align-items-center gap-2">
        <Tag value={diagnosis} severity={severity} />
        <span className="font-semibold">{confidence}%</span>
      </div>
    );
  };

  const actionTemplate = (rowData) => (
    <Button 
      icon="pi pi-search" 
      className="p-button-rounded p-button-info p-button-sm" 
      onClick={() => showDetails(rowData)}
      disabled={rowData.status !== 'Đã phân tích'}
      tooltip="Xem chi tiết"
    />
  );

  return (
    <div className="surface-ground p-4">
      <Toast ref={toast} />
      
      {/* Header */}
      <Card className="mb-4">
        <div className="text-center py-4">
          <h1 className="text-3xl font-bold text-primary mb-2">Hệ Thống Chẩn Đoán Bệnh Da AI</h1>
          <p className="text-lg text-600">Ứng dụng trí tuệ nhân tạo hỗ trợ chẩn đoán các bệnh da</p>
          
          {/* Connection Status */}
          <div className="mt-3">
            <Tag 
              value={connectionStatus === 'connected' ? 'Đã kết nối' : 
                     connectionStatus === 'disconnected' ? 'Mất kết nối' : 'Đang kiểm tra...'}
              severity={connectionStatus === 'connected' ? 'success' : 
                       connectionStatus === 'disconnected' ? 'danger' : 'warning'}
            />
            {connectionStatus === 'disconnected' && (
              <Button 
                label="Thử lại" 
                icon="pi pi-refresh" 
                className="p-button-sm p-button-text ml-2"
                onClick={testConnection}
              />
            )}
          </div>
        </div>
      </Card>

      {/* Upload Section */}
      <Card title="Tải lên hình ảnh da cần kiểm tra" className="mb-4">
        <FileUpload 
          ref={fileUploadRef}
          name="images" 
          url="/#"
          multiple 
          accept="image/*" 
          maxFileSize={16000000}
          customUpload={true}
          uploadHandler={onUpload}
          emptyTemplate={
            <div className="p-5 text-center">
              <i className="pi pi-image text-4xl mb-3 text-400"></i>
              <p className="text-600">Kéo thả hoặc chọn hình ảnh (PNG, JPG, JPEG)</p>
              <small className="text-500">Tối đa 16MB mỗi file</small>
            </div>
          }
        />
        
        <div className="flex justify-content-end gap-2 mt-3">
          <Button 
            label="Phân tích tất cả" 
            icon="pi pi-cog" 
            className="p-button-primary" 
            onClick={analyzeAllImages}
            loading={analyzing}
            disabled={images.length === 0 || connectionStatus !== 'connected'}
          />
        </div>
      </Card>

      {/* Results Table */}
      <Card title={`Danh sách hình ảnh (${images.length})`} className="mb-4">
        {analyzing && (
          <div className="flex align-items-center justify-content-center p-4 mb-3 bg-blue-50 border-round">
            <ProgressSpinner style={{ width: '32px', height: '32px' }} />
            <span className="ml-3 text-blue-700">Đang phân tích hình ảnh...</span>
          </div>
        )}
        
        <DataTable 
          value={images} 
          responsiveLayout="scroll"
          emptyMessage="Chưa có hình ảnh nào được tải lên"
          stripedRows
        >
          <Column field="name" header="Tên file" style={{ minWidth: '200px' }} />
          <Column header="Ảnh" body={imagePreviewTemplate} style={{ width: '100px' }} />
          <Column field="date" header="Thời gian" style={{ minWidth: '150px' }} />
          <Column header="Trạng thái" body={statusTemplate} style={{ width: '120px' }} />
          <Column header="Kết quả" body={resultTemplate} style={{ minWidth: '200px' }} />
          <Column header="Chi tiết" body={actionTemplate} style={{ width: '80px' }} />
        </DataTable>
      </Card>

      {/* Details Dialog */}
      <Dialog 
        header="Chi tiết kết quả chẩn đoán" 
        visible={detailsDialog} 
        style={{ width: '90vw', maxWidth: '800px' }} 
        onHide={() => setDetailsDialog(false)}
        maximizable
      >
        {selectedImage && selectedImage.result && (
          <div className="grid">
            <div className="col-12 md:col-4">
              <img 
                src={selectedImage.preview} 
                alt={selectedImage.name} 
                className="w-full border-round shadow-2" 
              />
              <div className="mt-3 p-3 surface-100 border-round">
                <p><strong>Tên file:</strong> {selectedImage.name}</p>
                <p><strong>Thời gian:</strong> {selectedImage.date}</p>
              </div>
            </div>
            
            <div className="col-12 md:col-8">
              <Panel header="Kết quả chẩn đoán" className="mb-3">
                <div className="text-center mb-4">
                  <Tag 
                    value={selectedImage.result.diagnosis} 
                    severity={['Melanoma', 'Ung Thư Biểu Mô'].includes(selectedImage.result.diagnosis) ? 'danger' :
                             selectedImage.result.diagnosis === 'Tổn Thương Tiền Ung Thư' ? 'warning' : 'success'}
                    className="text-xl p-3"
                  />
                  <div className="text-2xl font-bold mt-3 text-primary">
                    Độ tin cậy: {selectedImage.result.confidence}%
                  </div>
                </div>
                
                {selectedImage.result.details && (
                  <div className="grid text-center">
                    <div className="col-4">
                      <div className="text-lg font-bold text-orange-500">
                        {selectedImage.result.details.abnormalCells}%
                      </div>
                      <small>Tế bào bất thường</small>
                    </div>
                    <div className="col-4">
                      <div className="text-lg font-bold text-red-500">
                        {selectedImage.result.details.irregularBorders}%
                      </div>
                      <small>Viền không đều</small>
                    </div>
                    <div className="col-4">
                      <div className="text-lg font-bold text-purple-500">
                        {selectedImage.result.details.pigmentation}%
                      </div>
                      <small>Sắc tố bất thường</small>
                    </div>
                  </div>
                )}
              </Panel>

              {/* All Predictions */}
              {selectedImage.allPredictions && selectedImage.allPredictions.length > 0&& (
                <Panel header="Tất cả dự đoán" className="mb-3">
                  {selectedImage.allPredictions.slice(0, 9).map((pred, index) => (
                    <div key={index} className="flex justify-content-between align-items-center p-2 border-bottom-1 surface-border">
                      <span>{pred.class}</span>
                      <span className="font-bold">{pred.confidence}%</span>
                    </div>
                  ))}
                </Panel>
              )}

              {/* Recommendations */}
              <Panel header="Lưu ý">
                
                <div className="mt-3 p-2 bg-blue-50 border-round text-blue-800 text-sm">
                  <i className="pi pi-info-circle mr-2"></i>
                  <strong></strong> Kết quả này chỉ mang tính tham khảo và không thể thay thế chẩn đoán của bác sĩ chuyên khoa.
                </div>
              </Panel>
            </div>
          </div>
        )}
      </Dialog>
    </div>
  );
}