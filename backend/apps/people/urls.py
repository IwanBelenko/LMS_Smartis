from django.urls import path

from .views import (
    CandidateListCreateView,
    CandidateStageListView,
    EmployeeListCreateView,
    HcmSummaryView,
    PositionListView,
)

urlpatterns = [
    path("employees/", EmployeeListCreateView.as_view(), name="employees"),
    path("positions/", PositionListView.as_view(), name="positions"),
    path("candidates/", CandidateListCreateView.as_view(), name="candidates"),
    path("candidate-stages/", CandidateStageListView.as_view(), name="candidate-stages"),
    path("hcm/summary/", HcmSummaryView.as_view(), name="hcm-summary"),
]
