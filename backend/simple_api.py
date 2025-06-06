from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route('/')
def home():
    return jsonify({
        'message': 'API is running!',
        'status': 'OK'
    })

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'message': 'Simple health check'
    })

@app.route('/api/health')
def api_health():
    return jsonify({
        'status': 'healthy', 
        'message': 'API health check'
    })

if __name__ == '__main__':
    print("🚀 Starting Simple Test API...")
    print("Available routes:")
    print("  GET /")
    print("  GET /health") 
    print("  GET /api/health")
    
    app.run(debug=True, host='0.0.0.0', port=5000)