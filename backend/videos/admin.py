from django.contrib import admin
from .models import Video

@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'price', 'views', 'created_at']
    search_fields = ['title']
    list_filter = ['created_at']
