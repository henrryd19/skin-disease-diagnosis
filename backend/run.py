# backend/run.py - Production runner
from app import app
import logging

if __name__ == '__main__':
    # Setup production logging
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s %(levelname)s %(name)s %(message)s'
    )
    
    # Run with Gunicorn for production
    # gunicorn --bind 0.0.0.0:5000 --workers 2 run:app
    app.run(debug=False, host='0.0.0.0', port=5000)