import React from 'react';
import { Card } from 'primereact/card';
import { Button } from 'primereact/button';
import { Divider } from 'primereact/divider';
import { Panel } from 'primereact/panel';
import { Chart } from 'primereact/chart';
import { useRouter } from 'next/router';
import Link from 'next/link';
import 'primereact/resources/themes/lara-light-indigo/theme.css';  // theme
import 'primereact/resources/primereact.min.css';                  // core css
import 'primeicons/primeicons.css';           

export default function HomePage() {
  const router = useRouter();
  
  // Data for accuracy chart
  const accuracyData = {
    labels: ['Melanoma', 'Nốt Ruồi', 'Ung Thư Biểu Mô', 'Tổn Thương', 'Vẩy Nến', 'Chàm', 'Da Khỏe Mạnh'],
    datasets: [
      {
        label: 'Độ chính xác (%) theo nhóm bệnh',
        backgroundColor: 'rgba(75, 192, 192, 0.2)',
        borderColor: 'rgb(75, 192, 192)',
        borderWidth: 1,
        data: [91, 93, 89, 87, 88, 86, 95]
      }
    ]
  };
  
  // Chart options
  const options = {
    scales: {
      y: {
        beginAtZero: true,
        max: 100
      }
    },
    plugins: {
      legend: {
        position: 'top'
      }
    }
  };
  
  // Header for the hero section
  const heroHeader = (
    <div className="text-center py-5 bg-primary">
      <h1 className="text-4xl font-bold text-white m-0">Hệ Thống Chẩn Đoán Bệnh Da Thông Minh</h1>
      <p className="text-lg text-white-alpha-80 mt-3 mb-0">Ứng dụng trí tuệ nhân tạo hỗ trợ chẩn đoán các bệnh da với độ chính xác cao</p>
    </div>
  );
  
  return (
    <div className="surface-ground p-4">
      {/* Hero Section */}
      <Card header={heroHeader} className="mb-4">
        <div className="grid">
          <div className="col-12 md:col-6 flex align-items-center">
            <div className="p-4">
              <h2 className="text-3xl font-medium">Deep Learning cho Chẩn Đoán Da Liễu</h2>
              <p className="text-lg line-height-3 mt-3">
                Hệ thống AI phân tích hình ảnh da và chẩn đoán chính xác 7 nhóm bệnh da liễu phổ biến với độ tin cậy trên 85%. 
                Công nghệ này giúp bác sĩ và người dùng phát hiện sớm các dấu hiệu bất thường.
              </p>
              <div className="flex mt-5 gap-3">
                <Button 
                  label="Bắt đầu chẩn đoán" 
                  icon="pi pi-search-plus" 
                  className="p-button-raised p-button-rounded"
                  onClick={() => router.push('/diagnosis')}
                />
                <Button 
                  label="Tìm hiểu thêm" 
                  icon="pi pi-info-circle" 
                  className="p-button-outlined p-button-rounded"
                  onClick={() => router.push('/about')}
                />
              </div>
            </div>
          </div>
          <div className="col-12 md:col-6">
            <div className="p-4 flex justify-content-center">
              <img 
                src="https://cdn-prod.medicalnewstoday.com/content/images/articles/325/325042/dermatologist-looking-at-persons-arm.jpg" 
                alt="Dermatologist diagnosis" 
                className="border-round shadow-4" 
                style={{ maxWidth: '100%', height: 'auto' }}
              />
            </div>
          </div>
        </div>
      </Card>
      
      {/* Features Section */}
      <div className="text-center mb-4">
        <h2 className="text-3xl font-medium">Tính năng chính</h2>
        <p className="text-xl">Giải pháp toàn diện cho chẩn đoán bệnh da liễu</p>
      </div>
      
      <div className="grid mb-4">
        <div className="col-12 md:col-4 mb-4">
          <Panel header="Chẩn đoán nhanh chóng" className="h-full">
            <div className="text-center mb-3">
              <i className="pi pi-bolt text-5xl text-primary"></i>
            </div>
            <p>
              Tải lên hình ảnh và nhận kết quả phân tích trong vài giây. 
              Hệ thống sử dụng các thuật toán được tối ưu hóa cho thời gian phản hồi nhanh.
            </p>
          </Panel>
        </div>
        
        <div className="col-12 md:col-4 mb-4">
          <Panel header="Độ chính xác cao" className="h-full">
            <div className="text-center mb-3">
              <i className="pi pi-check-circle text-5xl text-primary"></i>
            </div>
            <p>
              Mô hình được huấn luyện trên hàng nghìn hình ảnh da với độ chính xác tổng thể trên 85%.
              Sử dụng ResNet50 và các kỹ thuật transfer learning tiên tiến.
            </p>
          </Panel>
        </div>
        
        <div className="col-12 md:col-4 mb-4">
          <Panel header="Phân tích chi tiết" className="h-full">
            <div className="text-center mb-3">
              <i className="pi pi-chart-bar text-5xl text-primary"></i>
            </div>
            <p>
              Nhận báo cáo chi tiết về từng chẩn đoán, bao gồm các chỉ số đo lường quan trọng 
              và khuyến nghị cụ thể dựa trên kết quả phân tích.
            </p>
          </Panel>
        </div>
      </div>
      
      {/* Statistics Section */}
      <Card title="Hiệu suất mô hình" subTitle="Độ chính xác theo nhóm bệnh" className="mb-4">
        <div className="grid">
          <div className="col-12 md:col-8">
            <Chart type="bar" data={accuracyData} options={options} />
          </div>
          <div className="col-12 md:col-4 flex align-items-center">
            <div>
              <h3>Độ đo hiệu suất</h3>
              <ul className="line-height-3">
                <li><strong>Accuracy:</strong> 89%</li>
                <li><strong>Precision:</strong> 87%</li>
                <li><strong>Recall:</strong> 86%</li>
                <li><strong>F1-score:</strong> 86%</li>
                <li><strong>AUC:</strong> 92%</li>
              </ul>
              <Button 
                label="Xem chi tiết" 
                icon="pi pi-external-link" 
                className="p-button-text mt-3"
                onClick={() => router.push('/metrics')}
              />
            </div>
          </div>
        </div>
      </Card>
      
      {/* CTA Section */}
      <Card className="mb-4">
        <div className="text-center p-5">
          <h2 className="text-3xl font-medium mb-3">Bắt đầu chẩn đoán ngay hôm nay</h2>
          <p className="text-xl mb-5">
            Tải lên hình ảnh và nhận kết quả phân tích chỉ trong vài bước đơn giản
          </p>
          <Button 
            label="Đi đến trang chẩn đoán" 
            icon="pi pi-arrow-right" 
            className="p-button-lg"
            onClick={() => router.push('/diagnosis')}
          />
          <Button 
            label="Huấn luyện mô hình" 
            icon="pi pi-cog" 
            className="p-button-lg p-button-outlined ml-3"
            onClick={() => router.push('/training')}
            />
        </div>
      </Card>
      
      {/* Footer */}
      <div className="text-center text-600 mt-6">
        <p>© {new Date().getFullYear()} Hệ Thống Chẩn Đoán Bệnh Da Thông Minh. Đồ án tốt nghiệp.</p>
        <div className="flex justify-content-center gap-3">
          <Link href="/about">Giới thiệu</Link>
          <Link href="/contact">Liên hệ</Link>
          <Link href="/terms">Điều khoản sử dụng</Link>
        </div>
      </div>
    </div>
  );
}