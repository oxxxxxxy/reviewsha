{{- define "reviewsha.name" -}}
reviewsha
{{- end }}

{{- define "reviewsha.fullname" -}}
{{ include "reviewsha.name" . }}
{{- end }}
