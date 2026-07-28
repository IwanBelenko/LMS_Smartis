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
)

admin.site.register([
    Position, StaffPosition, EmployeeProfile, EmployeeGoal, EmploymentEvent, EmployeeLearning,
    EmployeeDocument, CandidateStage, Candidate, AuditEvent,
])
