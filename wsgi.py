import sys
import os

# Add your project directory to the sys.path
project_home = '/home/Diaaa/Dia'
if project_home not in sys.path:
    sys.path.insert(0, project_home)

# Import flask app
from flask_app import app as application
