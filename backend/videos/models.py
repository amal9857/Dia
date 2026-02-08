from django.db import models
from django.utils import timezone

class Video(models.Model):
    title = models.CharField(max_length=200)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    image = models.ImageField(upload_to='thumbnails/')
    video_file = models.FileField(upload_to='videos/')
    views = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return self.title
    
    class Meta:
        ordering = ['-created_at']

class Order(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending Approval'),
        ('approved', 'Approved'),
    ]

    txn_id = models.CharField(max_length=100, unique=True, verbose_name="Transaction ID")
    buyer_name = models.CharField(max_length=100)
    email = models.EmailField(blank=True, null=True)
    video = models.ForeignKey(Video, on_delete=models.SET_NULL, null=True, blank=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)
    approval_date = models.DateTimeField(null=True, blank=True)
    
    def save(self, *args, **kwargs):
        if self.status == 'approved' and not self.approval_date:
            self.approval_date = timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.buyer_name} - {self.txn_id}"
