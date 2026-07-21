from django.contrib import admin
from django.conf import settings
from django.conf.urls.static import static
from django.urls import include, path

from apps.learning.views import scorm_content

urlpatterns = [
    path("admin/", admin.site.urls),
    path("scorm-content/<int:course_id>/<str:token>/<path:asset_path>", scorm_content),
    path("api/v1/", include("apps.core.urls")),
    path("api/v1/", include("apps.identity.urls")),
    path("api/v1/", include("apps.learning.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
