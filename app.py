from flask import Flask, send_from_directory
import os

app = Flask(__name__)

@app.route('/')
def home():
    try:
        return send_from_directory('/home/Diaaa/Dia', 'index.html')
    except:
        return send_from_directory('.', 'index.html')

@app.route('/<path:path>')
def static_files(path):
    try:
        return send_from_directory('/home/Diaaa/Dia', path)
    except:
        return send_from_directory('.', path)

application = app
