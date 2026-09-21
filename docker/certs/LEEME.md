# Certificados raíz de la empresa

Esta carpeta existe para las redes que inspeccionan el tráfico HTTPS con su
propio certificado (Zscaler, Fortinet, Netskope y similares). En esas redes los
contenedores fallan al descargar paquetes con:

    TLS: server certificate not trusted

Solución: deja aquí el certificado raíz de la empresa con extensión `.crt`, en
formato PEM (el que empieza por `-----BEGIN CERTIFICATE-----`). Cada etapa de
la imagen lo agrega al almacén de confianza antes de descargar nada.

Cómo obtenerlo desde un equipo Windows que ya confía en él, en PowerShell:

```powershell
$pem = foreach ($c in Get-ChildItem Cert:\LocalMachine\Root) {
  "-----BEGIN CERTIFICATE-----"
  [Convert]::ToBase64String($c.RawData, 'InsertLineBreaks')
  "-----END CERTIFICATE-----"
}
$pem | Set-Content docker\certs\empresa.crt -Encoding ascii
```

Los archivos `.crt` no se versionan: cada red tiene los suyos. Si la carpeta
queda vacía, la imagen se construye igual.
