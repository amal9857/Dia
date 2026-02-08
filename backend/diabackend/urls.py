"""
URL configuration for diabackend project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.views.generic import RedirectView
from django.http import FileResponse
from rest_framework.routers import DefaultRouter
from videos.views import VideoViewSet
import os

router = DefaultRouter()
router.register(r'videos', VideoViewSet)

def serve_frontend(request, path='index.html'):
    frontend_dir = os.path.join(settings.BASE_DIR.parent)
    file_path = os.path.join(frontend_dir, path)
    if os.path.exists(file_path):
        return FileResponse(open(file_path, 'rb'))
    return FileResponse(open(os.path.join(frontend_dir, 'index.html'), 'rb'))

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include(router.urls)),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT) + [
    path('', serve_frontend),
    path('<path:path>', serve_frontend),
]
