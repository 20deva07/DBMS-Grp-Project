"""
The Grand Horizon Hotel System - Live Full-Stack Server
Runs both Frontend & PostgreSQL REST API seamlessly on http://localhost:8000.
Run: python server.py
"""

import os
import sys

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(DIRECTORY, "backend"))
sys.path.insert(0, DIRECTORY)

try:
    from app import app, auto_init_database, DB_CONFIG
    has_flask = True
except Exception as e:
    has_flask = False
    flask_err = str(e)

PORT = 8000

def run_server():
    if has_flask:
        print("=" * 65)
        print(" The Grand Horizon Luxury Hotel System - Live PostgreSQL Server")
        print(f" Connecting to PostgreSQL database: '{DB_CONFIG['database']}'...")
        auto_init_database()
        print("=" * 65)
        print(f" Live Website & Database API running at: http://localhost:{PORT}")
        print(f" Database Health Check:                 http://localhost:{PORT}/api/status")
        print(" Press Ctrl+C to stop the server.")
        print("=" * 65)
        app.run(host="127.0.0.1", port=PORT, debug=False, use_reloader=False, threaded=True)
    else:
        import http.server
        import socketserver
        os.chdir(DIRECTORY)
        with socketserver.TCPServer(("", PORT), http.server.SimpleHTTPRequestHandler) as httpd:
            print("=" * 60)
            print(f" Running in Static Mode (Flask notice: {flask_err})")
            print(f" Open http://localhost:{PORT}")
            print("=" * 60)
            httpd.serve_forever()

if __name__ == "__main__":
    run_server()
