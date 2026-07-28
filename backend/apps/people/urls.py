from django.urls import path

from .views import (
    CandidateDetailView,
    CandidateListCreateView,
    CandidateStageListView,
    EmployeeDetailView,
    EmployeeListCreateView,
    HcmSummaryView,
    PositionListView,
)

urlpatterns = [
    path("employees/", EmployeeListCreateView.as_view(), name="employees"),
    path("employees/<int:pk>/", EmployeeDetailView.as_view(), name="employee-detail"),
    path("positions/", PositionListView.as_view(), name="positions"),
    path("candidates/", CandidateListCreateView.as_view(), name="candidates"),
    path("candidates/<int:pk>/", CandidateDetailView.as_view(), name="candidate-detail"),
    path("candidate-stages/", CandidateStageListView.as_view(), name="candidate-stages"),
    path("hcm/summary/", HcmSummaryView.as_view(), name="hcm-summary"),
]
