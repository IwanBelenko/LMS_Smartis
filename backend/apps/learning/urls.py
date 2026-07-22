from rest_framework.routers import DefaultRouter

from .views import ContentFolderViewSet, ContentProjectViewSet, CourseViewSet, LearningPathViewSet

router = DefaultRouter()
router.register("projects", ContentProjectViewSet, basename="content-project")
router.register("folders", ContentFolderViewSet, basename="content-folder")
router.register("learning-paths", LearningPathViewSet, basename="learning-path")
router.register("courses", CourseViewSet, basename="course")

urlpatterns = router.urls
