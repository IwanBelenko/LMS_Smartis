from django.contrib import admin

from .models import (
    AbsenceRequest,
    Competency,
    DailyTranscript,
    AuditEvent,
    Candidate,
    CandidateStage,
    EmployeeDocument,
    EmployeeGoal,
    EmployeeLearning,
    EmployeeProfile,
    EmploymentEvent,
    Position,
    StaffPosition,
    Vacancy,
    OnboardingPlan,
    OnboardingTemplate,
    PerformanceCycle,
    PerformanceReview,
    PerformanceScore,
)

admin.site.register([
    Position, StaffPosition, EmployeeProfile, EmployeeGoal, EmploymentEvent, EmployeeLearning,
    EmployeeDocument, AbsenceRequest, PerformanceCycle, Competency, PerformanceReview, PerformanceScore, DailyTranscript,
    OnboardingTemplate, OnboardingPlan, CandidateStage, Vacancy, Candidate, AuditEvent,
])
