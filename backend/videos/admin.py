from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from .models import Video, Order

@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ['title', 'price_display', 'views', 'created_at', 'thumbnail_preview']
    search_fields = ['title']
    list_filter = ['created_at']
    readonly_fields = ['views']

    def price_display(self, obj):
        return f"₹{obj.price}"
    price_display.short_description = "Price"

    def thumbnail_preview(self, obj):
        if obj.image:
            return format_html('<img src="{}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px;" />', obj.image.url)
        return "No Image"
    thumbnail_preview.short_description = "Thumbnail"

@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['txn_id', 'buyer_name', 'status_badge', 'amount_display', 'video_link', 'created_at', 'action_buttons']
    list_filter = ['status', 'created_at']
    search_fields = ['txn_id', 'buyer_name', 'email']
    readonly_fields = ['created_at', 'approval_date']
    actions = ['approve_orders']

    def amount_display(self, obj):
        return f"₹{obj.amount}"
    amount_display.short_description = "Amount"

    def video_link(self, obj):
        if obj.video:
            return obj.video.title
        return "-"
    video_link.short_description = "Video"

    def status_badge(self, obj):
        if obj.status == 'approved':
            return format_html('<span class="badge badge-success"><i class="fas fa-check-circle"></i> Approved</span>')
        return format_html('<span class="badge badge-warning"><i class="fas fa-clock"></i> Pending</span>')
    status_badge.short_description = "Status"
    status_badge.admin_order_field = 'status'

    def action_buttons(self, obj):
        if obj.status == 'pending':
            return format_html(
                '<a class="btn btn-sm btn-success" href="javascript:;" onclick="document.getElementById(\'approve-txn-{}\').click()">'
                '<i class="fas fa-check"></i> Approve'
                '</a>'
                '<span style="display:none;" id="approve-txn-{}" onclick="window.location.href=\'../{}/change/\'"></span>',
                obj.id, obj.id, obj.id
            )
        
        # Check 10-day lock
        if obj.approval_date:
            days_passed = (timezone.now() - obj.approval_date).days
            if days_passed < 10:
                days_left = 10 - days_passed
                return format_html('<span class="text-muted"><i class="fas fa-lock"></i> Locked ({}d left)</span>', days_left)
        
        return format_html('<span class="text-danger"><i class="fas fa-unlock"></i> Safe to Delete</span>')
    action_buttons.short_description = "Actions"

    @admin.action(description='Approve selected orders')
    def approve_orders(self, request, queryset):
        queryset.update(status='approved', approval_date=timezone.now())
        self.message_user(request, f"Selected orders have been approved.")
