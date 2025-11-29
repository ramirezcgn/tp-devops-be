import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { Resource } from '@opentelemetry/resources';
import {
  ATTR_SERVICE_NAME,
  ATTR_SERVICE_VERSION,
} from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { IORedisInstrumentation } from '@opentelemetry/instrumentation-ioredis';
import { PgInstrumentation } from '@opentelemetry/instrumentation-pg';

// Configuración del exportador OTLP (OpenTelemetry Protocol)
// Jaeger soporta OTLP nativamente desde v1.35+
const otlpExporter = new OTLPTraceExporter({
  // El endpoint OTLP HTTP de Jaeger es en el puerto 4318
  url: process.env.JAEGER_OTLP_ENDPOINT || 'http://localhost:4318/v1/traces',
});

// Configuración del recurso (metadatos del servicio)
const resource = new Resource({
  [ATTR_SERVICE_NAME]: 'devops-be',
  [ATTR_SERVICE_VERSION]: '1.0.0',
  environment: process.env.NODE_ENV || 'development',
});

// Configuración del SDK de OpenTelemetry
const sdk = new NodeSDK({
  resource,
  traceExporter: otlpExporter,
  instrumentations: [
    // Auto-instrumentación de Node.js
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': {
        enabled: false, // Desactivar tracing de filesystem
      },
    }),
    // Instrumentación específica de Express
    new ExpressInstrumentation({
      requestHook: (span, requestInfo) => {
        span.setAttribute('http.request.body', JSON.stringify(requestInfo.request.body));
      },
    }),
    // Instrumentación de HTTP
    new HttpInstrumentation(),
    // Instrumentación de Redis
    new IORedisInstrumentation({
      responseHook: (span, response) => {
        span.setAttribute('redis.response', JSON.stringify(response));
      },
    }),
    // Instrumentación de PostgreSQL
    new PgInstrumentation({
      enhancedDatabaseReporting: true,
    }),
  ],
});

// Inicializar el SDK
export function initTelemetry() {
  sdk.start();
  console.log('OpenTelemetry initialized successfully');

  // Manejo de cierre graceful
  process.on('SIGTERM', () => {
    sdk
      .shutdown()
      .then(() => console.log('OpenTelemetry shut down successfully'))
      .catch((error) => console.error('Error shutting down OpenTelemetry', error))
      .finally(() => process.exit(0));
  });
}

export default sdk;
