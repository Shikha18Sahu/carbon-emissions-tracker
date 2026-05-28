import os
import sys

# Ensure django can find breatheesg_backend
sys.path.append(os.path.dirname(os.path.dirname(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'breatheesg_backend.settings')

from breatheesg_backend.wsgi import application
