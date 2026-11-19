{{/*
Expand the name of the chart.
*/}}
{{- define "gadget.name" -}}
{{- default .Chart.Name .Values.nameOverride | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Create a default fully qualified app name.
*/}}
{{- define "gadget.fullname" -}}
{{- if .Values.fullnameOverride }}
{{- .Values.fullnameOverride | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- $name := default .Chart.Name .Values.nameOverride }}
{{- if contains $name .Release.Name }}
{{- .Release.Name | trunc 63 | trimSuffix "-" }}
{{- else }}
{{- printf "%s-%s" .Release.Name $name | trunc 63 | trimSuffix "-" }}
{{- end }}
{{- end }}
{{- end }}

{{/* Component-specific fully qualified names */}}
{{- define "gadget.frontend.fullname" -}}
{{- printf "%s-frontend" (include "gadget.fullname" .) }}
{{- end }}

{{- define "gadget.backend.fullname" -}}
{{- printf "%s-backend" (include "gadget.fullname" .) }}
{{- end }}

{{- define "gadget.database.fullname" -}}
{{- printf "%s-database" (include "gadget.fullname" .) }}
{{- end }}

{{/*
Create chart name and version as used by the chart label.
*/}}
{{- define "gadget.chart" -}}
{{- printf "%s-%s" .Chart.Name .Chart.Version | replace "+" "_" | trunc 63 | trimSuffix "-" }}
{{- end }}

{{/*
Common labels
*/}}
{{- define "gadget.labels" -}}
helm.sh/chart: {{ include "gadget.chart" . }}
{{ include "gadget.selectorLabels" . }}
{{- if .Chart.AppVersion }}
app.kubernetes.io/version: {{ .Chart.AppVersion | quote }}
{{- end }}
app.kubernetes.io/managed-by: {{ .Release.Service }}
{{- end }}

{{/*
Selector labels
*/}}
{{- define "gadget.selectorLabels" -}}
app.kubernetes.io/name: {{ include "gadget.name" . }}
app.kubernetes.io/instance: {{ .Release.Name }}
{{- end }}

{{/*
Create the name of the service account to use
*/}}
{{- define "gadget.serviceAccountName" -}}
{{- if .Values.serviceAccount.create }}
{{- default (include "gadget.fullname" .) .Values.serviceAccount.name }}
{{- else }}
{{- default "default" .Values.serviceAccount.name }}
{{- end }}
{{- end }}
