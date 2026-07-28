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
    Interview,
    InterviewFeedback,
    Position,
    StaffPosition,
    Vacancy,
    OnboardingPlan,
    OnboardingTemplate,
    PerformanceCycle,
    PerformanceReview,
    PerformanceScore,
    ProductUpdate,
)

admin.site.register([
    Position, StaffPosition, EmployeeProfile, EmployeeGoal, EmploymentEvent, EmployeeLearning,
    EmployeeDocument, AbsenceRequest, PerformanceCycle, Competency, PerformanceReview, PerformanceScore,
    DailyTranscript, ProductUpdate,
    OnboardingTemplate, OnboardingPlan, CandidateStage, Vacancy, Candidate, AuditEvent,
    Interview, InterviewFeedback,
])
