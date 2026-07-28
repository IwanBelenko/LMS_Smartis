from django.contrib import admin

from .models import AuditEvent, Candidate, CandidateStage, EmployeeProfile, Position

admin.site.register([Position, EmployeeProfile, CandidateStage, Candidate, AuditEvent])
