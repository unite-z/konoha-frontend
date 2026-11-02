/**
 * Interruptor único de los datos simulados de las pantallas nuevas del MOD-06 (S11-S12).
 * `VITE_DATOS_SIMULADOS=true` en `.env`: los servicios responden con `src/services/simulados/`.
 * Cualquier otro valor (o sin definir): backend real. No es secreto: llega al navegador.
 */
export const DATOS_SIMULADOS: boolean = import.meta.env.VITE_DATOS_SIMULADOS === 'true'
