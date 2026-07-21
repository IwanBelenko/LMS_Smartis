from rest_framework.permissions import SAFE_METHODS, BasePermission

from apps.identity.models import User


class IsCourseManagerOrReadOnly(BasePermission):
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return bool(request.user and request.user.is_authenticated)
        return bool(
            request.user
            and request.user.is_authenticated
            and (
                request.user.is_superuser
                or request.user.role in {User.Role.ADMIN, User.Role.AUTHOR}
            )
        )

    def has_object_permission(self, request, view, obj):
        if request.method in SAFE_METHODS:
            return True
        if request.user.is_superuser or request.user.role == User.Role.ADMIN:
            return True
        return request.user.role == User.Role.AUTHOR and obj.author_id == request.user.id
