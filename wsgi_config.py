import os
from flask import Flask, send_from_directory

app = Flask(__name__)

# Path to your static files
STATIC_DIR = '/home/Diaaa/Dia'

@app.route('/')
def index():
    return send_from_directory(STATIC_DIR, 'index.html')

@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(STATIC_DIR, path)

# For 404 errors, redirect to index (for SPA routing)
@app.errorhandler(404)
def not_found(e):
    return send_from_directory(STATIC_DIR, 'index.html')
