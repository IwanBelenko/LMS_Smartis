from django.contrib import admin

from .models import (
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
)

admin.site.register([
    Position, StaffPosition, EmployeeProfile, EmployeeGoal, EmploymentEvent, EmployeeLearning,
    EmployeeDocument, CandidateStage, Vacancy, Candidate, AuditEvent,
])
