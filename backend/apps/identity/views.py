from rest_framework import generics, status
from rest_framework.authtoken.models import Token
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Department, User
from .permissions import IsAdministrator
from .serializers import DepartmentSerializer, LoginSerializer, UserCreateSerializer, UserSerializer


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)
        return Response({"token": token.key, "user": UserSerializer(user).data})


class LogoutView(APIView):
    def post(self, request):
        Token.objects.filter(user=request.user).delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class MeView(APIView):
    def get(self, request):
        return Response(UserSerializer(request.user).data)


class DepartmentListCreateView(generics.ListCreateAPIView):
    queryset = Department.objects.filter(is_active=True)
    serializer_class = DepartmentSerializer

    def get_permissions(self):
        permission_classes = [IsAuthenticated] if self.request.method == "GET" else [IsAdministrator]
        return [permission() for permission in permission_classes]


class UserListCreateView(generics.ListCreateAPIView):
    queryset = User.objects.select_related("department").order_by("last_name", "first_name", "email")
    permission_classes = [IsAdministrator]

    def get_serializer_class(self):
        return UserCreateSerializer if self.request.method == "POST" else UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_201_CREATED)
